import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  const client = await ensureSchema();
  const { searchParams } = new URL(req.url);

  let sql = 'SELECT * FROM sites WHERE 1=1';
  const args: (string | number | null)[] = [];

  const county = searchParams.get('county');
  const municipality = searchParams.get('municipality');
  const sewer = searchParams.get('sewer');
  const status = searchParams.get('status');
  const devType = searchParams.get('devType');
  const minAcreage = searchParams.get('minAcreage');
  const maxAcreage = searchParams.get('maxAcreage');
  const search = searchParams.get('search');
  const zoning = searchParams.get('zoning');

  if (county) { sql += ' AND LOWER(county) = LOWER(?)'; args.push(county); }
  if (municipality) { sql += ' AND LOWER(municipality) = LOWER(?)'; args.push(municipality); }
  if (sewer) { sql += ' AND sewer = ?'; args.push(sewer); }
  if (status) { sql += ' AND status = ?'; args.push(status); }
  if (zoning) { sql += ' AND LOWER(zoning) LIKE LOWER(?)'; args.push(`%${zoning}%`); }
  if (minAcreage) { sql += ' AND acreage >= ?'; args.push(parseFloat(minAcreage)); }
  if (maxAcreage) { sql += ' AND acreage <= ?'; args.push(parseFloat(maxAcreage)); }
  if (devType) { sql += ' AND dev_types LIKE ?'; args.push(`%${devType}%`); }
  if (search) {
    sql += ' AND (LOWER(address) LIKE LOWER(?) OR LOWER(county) LIKE LOWER(?) OR LOWER(municipality) LIKE LOWER(?) OR LOWER(notes) LIKE LOWER(?))';
    const s = `%${search}%`;
    args.push(s, s, s, s);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await client.execute({ sql, args });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const client = await ensureSchema();
  const body = await req.json();

  const result = await client.execute({
    sql: `INSERT INTO sites (address, county, municipality, township, acreage, sewer, dev_types, zoning, status, notes, lat, lng, nj_property_records_url, polygon_coords)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      body.address || '',
      body.county || '',
      body.municipality || '',
      body.township || '',
      body.acreage ?? null,
      body.sewer || '',
      JSON.stringify(body.dev_types || []),
      body.zoning || '',
      body.status || 'undecided',
      body.notes || '',
      body.lat ?? null,
      body.lng ?? null,
      body.nj_property_records_url || '',
      JSON.stringify(body.polygon_coords || []),
    ],
  });

  const site = await client.execute({
    sql: 'SELECT * FROM sites WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });

  return NextResponse.json(site.rows[0], { status: 201 });
}
