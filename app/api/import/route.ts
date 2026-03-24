import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import { ensureSchema } from '@/lib/db';

const KML_PATH = 'C:\\Users\\Bluba\\OneDrive - B&S Contracting\\Desktop\\Maps\\All Property Map.kml';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAcreage(name: string): number | null {
  const match = name.match(/(\d+[\d,.]*)\s*acres?/i);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  return null;
}

function folderToMeta(folderName: string): { sewer: string; devTypes: string[]; status: string } {
  const name = folderName.toLowerCase();
  let sewer = '';
  if (name.includes('partial sewer')) sewer = 'partial';
  else if (name.includes('no sewer')) sewer = 'no';
  else if (name.includes('sewer')) sewer = 'yes';

  const devTypes: string[] = [];
  if (name.includes('warehouse')) devTypes.push('Warehouse');
  if (name.includes('resi')) devTypes.push('Residential');

  const status = name.includes('no good') ? 'no' : 'undecided';

  return { sewer, devTypes, status };
}

export async function POST() {
  if (!fs.existsSync(KML_PATH)) {
    return NextResponse.json({ error: 'KML file not found at expected path' }, { status: 404 });
  }

  const kmlContent = fs.readFileSync(KML_PATH, 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata' });
  const result = parser.parse(kmlContent);

  const client = await ensureSchema();
  const folders = result?.kml?.Document?.Folder;
  if (!folders) return NextResponse.json({ error: 'No folders found in KML' }, { status: 400 });

  const folderList = Array.isArray(folders) ? folders : [folders];

  let imported = 0;
  let skipped = 0;

  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  for (const folder of folderList) {
    const folderName = folder.name || '';
    const meta = folderToMeta(folderName);
    const placemarks = folder.Placemark;
    if (!placemarks) continue;

    const pmList = Array.isArray(placemarks) ? placemarks : [placemarks];

    const points: { name: string; desc: string; lat: number; lng: number }[] = [];
    const polygons: { name: string; desc: string; coords: number[][] }[] = [];

    for (const pm of pmList) {
      const pmName = pm.name || '';
      const descRaw = pm.description?.__cdata || pm.description || '';
      const desc = typeof descRaw === 'string' ? descRaw : String(descRaw);

      if (pm.Point) {
        const coordStr = pm.Point.coordinates?.toString().trim() || '';
        const parts = coordStr.split(',');
        if (parts.length >= 2) {
          points.push({ name: pmName, desc, lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) });
        }
      } else if (pm.Polygon) {
        const coordStr = pm.Polygon?.outerBoundaryIs?.LinearRing?.coordinates?.toString().trim() || '';
        const coords: number[][] = coordStr
          .trim().split(/\s+/)
          .map((c: string) => { const p = c.split(','); return p.length >= 2 ? [parseFloat(p[0]), parseFloat(p[1])] : null; })
          .filter(Boolean) as number[][];
        polygons.push({ name: pmName, desc, coords });
      }
    }

    const usedPolygons = new Set<number>();

    for (const point of points) {
      let bestIdx = -1;
      let bestDist = Infinity;
      polygons.forEach((poly, idx) => {
        if (usedPolygons.has(idx) || poly.coords.length === 0) return;
        const centerLng = poly.coords.reduce((s, c) => s + c[0], 0) / poly.coords.length;
        const centerLat = poly.coords.reduce((s, c) => s + c[1], 0) / poly.coords.length;
        const dist = Math.sqrt(Math.pow(point.lat - centerLat, 2) + Math.pow(point.lng - centerLng, 2));
        if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
      });

      const polygon = bestIdx >= 0 && bestDist < 0.1 ? polygons[bestIdx] : null;
      if (polygon) usedPolygons.add(bestIdx);

      const acreage = polygon ? parseAcreage(polygon.name) : null;
      const notes = polygon ? stripHtml(polygon.desc) : '';
      const njUrl = point.desc.includes('njpropertyrecords.com') ? point.desc.trim() : '';

      statements.push({
        sql: `INSERT INTO sites (address, county, municipality, township, acreage, sewer, dev_types, zoning, status, notes, lat, lng, nj_property_records_url, polygon_coords)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [point.name, '', '', '', acreage, meta.sewer, JSON.stringify(meta.devTypes), '', meta.status, notes, point.lat, point.lng, njUrl, JSON.stringify(polygon?.coords || [])],
      });
      imported++;
    }

    polygons.forEach((poly, idx) => {
      if (usedPolygons.has(idx) || poly.coords.length === 0) return;
      const acreage = parseAcreage(poly.name);
      const notes = stripHtml(poly.desc);
      const lat = poly.coords.reduce((s, c) => s + c[1], 0) / poly.coords.length;
      const lng = poly.coords.reduce((s, c) => s + c[0], 0) / poly.coords.length;
      statements.push({
        sql: `INSERT INTO sites (address, county, municipality, township, acreage, sewer, dev_types, zoning, status, notes, lat, lng, nj_property_records_url, polygon_coords)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [poly.name || 'Unknown', '', '', '', acreage, meta.sewer, JSON.stringify(meta.devTypes), '', meta.status, notes, lat, lng, '', JSON.stringify(poly.coords)],
      });
      imported++;
    });
  }

  try {
    // Batch insert in chunks of 50
    for (let i = 0; i < statements.length; i += 50) {
      const chunk = statements.slice(i, i + 50);
      await client.batch(chunk, 'write');
    }
  } catch (e) {
    skipped = statements.length;
    imported = 0;
    return NextResponse.json({ error: String(e), imported: 0, skipped }, { status: 500 });
  }

  return NextResponse.json({ success: true, imported, skipped });
}
