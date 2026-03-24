import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function ensureSchema(): Promise<Client> {
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      county TEXT DEFAULT '',
      municipality TEXT DEFAULT '',
      township TEXT DEFAULT '',
      acreage REAL,
      sewer TEXT DEFAULT '',
      dev_types TEXT DEFAULT '[]',
      zoning TEXT DEFAULT '',
      status TEXT DEFAULT 'undecided',
      notes TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      nj_property_records_url TEXT DEFAULT '',
      polygon_coords TEXT DEFAULT '[]',
      pipeline_stage TEXT DEFAULT 'identified',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return client;
}
