import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await ensureSchema();
  const { id } = await params;
  const result = await client.execute({ sql: 'SELECT * FROM sites WHERE id = ?', args: [id] });
  if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await ensureSchema();
  const { id } = await params;
  const body = await req.json();

  await client.execute({
    sql: `UPDATE sites SET
      address = ?, county = ?, municipality = ?, township = ?,
      acreage = ?, sewer = ?, dev_types = ?, zoning = ?,
      status = ?, notes = ?, lat = ?, lng = ?,
      nj_property_records_url = ?, polygon_coords = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
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
      id,
    ],
  });

  const result = await client.execute({ sql: 'SELECT * FROM sites WHERE id = ?', args: [id] });
  return NextResponse.json(result.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await ensureSchema();
  const { id } = await params;
  const body = await req.json();

  await client.execute({
    sql: 'UPDATE sites SET pipeline_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [body.pipeline_stage || 'identified', id],
  });

  const result = await client.execute({ sql: 'SELECT * FROM sites WHERE id = ?', args: [id] });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await ensureSchema();
  const { id } = await params;
  await client.execute({ sql: 'DELETE FROM sites WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
