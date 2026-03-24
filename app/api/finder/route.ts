import { NextRequest, NextResponse } from 'next/server';

const LAYER_URL = 'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0';
const TIMEOUT_MS = 15000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const county = searchParams.get('county')?.trim();
  const municipality = searchParams.get('municipality')?.trim();
  const minAcreage = searchParams.get('minAcreage');
  const maxAcreage = searchParams.get('maxAcreage');
  const propClass = searchParams.get('propClass')?.trim();

  if (!county) {
    return NextResponse.json({ error: 'County is required' }, { status: 400 });
  }

  // Build WHERE clause
  const clauses: string[] = [];
  clauses.push(`UPPER(COUNTY) = '${county.toUpperCase().replace(/'/g, "''")}'`);

  if (municipality) {
    clauses.push(`UPPER(MUNNAME) LIKE UPPER('${municipality.replace(/'/g, "''")}%')`);
  }

  if (minAcreage && !isNaN(parseFloat(minAcreage))) {
    clauses.push(`CALCACRES >= ${parseFloat(minAcreage)}`);
  }

  if (maxAcreage && !isNaN(parseFloat(maxAcreage))) {
    clauses.push(`CALCACRES <= ${parseFloat(maxAcreage)}`);
  }

  if (propClass && propClass !== 'any') {
    // Map friendly class names to actual codes
    const classMap: Record<string, string[]> = {
      residential: ['1', '2'],
      farm: ['3A', '3B'],
      commercial: ['4A', '4B', '4C'],
      industrial: ['5A', '5B'],
      vacant: ['1'],
    };
    const codes = classMap[propClass.toLowerCase()];
    if (codes) {
      const inList = codes.map(c => `'${c}'`).join(',');
      clauses.push(`PROPCLASS IN (${inList})`);
    } else {
      // raw value passed
      clauses.push(`PROPCLASS = '${propClass.replace(/'/g, "''")}'`);
    }
  }

  const where = clauses.join(' AND ');

  const params = new URLSearchParams({
    where,
    outFields: '*',
    returnCentroid: 'true',
    returnGeometry: 'false',
    f: 'json',
    outSR: '4326',
    resultRecordCount: '150',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${LAYER_URL}/query?${params}`, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ error: 'ArcGIS query failed', status: res.status }, { status: 502 });
    }

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'ArcGIS error' }, { status: 502 });
    }

    const features: Array<{ attrs: Record<string, unknown>; lat: number | null; lng: number | null }> =
      (data.features || []).map((f: { attributes: Record<string, unknown>; centroid?: { x: number; y: number } }) => ({
        attrs: f.attributes,
        lat: f.centroid?.y ?? null,
        lng: f.centroid?.x ?? null,
      }));

    return NextResponse.json({ features, count: features.length });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg.includes('abort') ? 'Request timed out' : msg }, { status: 502 });
  }
}
