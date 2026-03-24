import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 8000;

async function queryArcGIS(url: string, lat: number, lng: number): Promise<Record<string, unknown>[] | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'false',
    outFields: '*',
    f: 'json',
    inSR: '4326',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${url}/query?${params}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.features && Array.isArray(data.features)) {
      return data.features.map((f: { attributes: Record<string, unknown> }) => f.attributes);
    }
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const LAYERS = {
    parcels: 'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0',
    openSpace: 'https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/1',
    highlands: 'https://maps.nj.gov/arcgis/rest/services/Framework/Government_Boundaries/MapServer/6',
    wetlands: 'https://mapsdep.nj.gov/arcgis/rest/services/Features/Land_lu/MapServer/2',
    contamination: 'https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_NJEMS/MapServer/0',
    farmland: 'https://services.arcgis.com/gzSkSfQGxyX6dicF/arcgis/rest/services/NJFPP_Preserved_Farms/FeatureServer/0',
    flood: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',
  };

  const [parcels, openSpace, highlands, wetlands, contamination, farmland, flood] = await Promise.all([
    queryArcGIS(LAYERS.parcels, lat, lng),
    queryArcGIS(LAYERS.openSpace, lat, lng),
    queryArcGIS(LAYERS.highlands, lat, lng),
    queryArcGIS(LAYERS.wetlands, lat, lng),
    queryArcGIS(LAYERS.contamination, lat, lng),
    queryArcGIS(LAYERS.farmland, lat, lng),
    queryArcGIS(LAYERS.flood, lat, lng),
  ]);

  return NextResponse.json({
    parcels,
    openSpace,
    highlands,
    wetlands,
    contamination,
    farmland,
    flood,
  });
}
