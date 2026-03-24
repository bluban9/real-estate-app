'use client';

import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Sites', href: '/' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Finder', href: '/finder' },
  { label: 'Lookup', href: '/lookup', active: true },
];

interface LookupResult {
  parcels: Record<string, unknown>[] | null;
  openSpace: Record<string, unknown>[] | null;
  highlands: Record<string, unknown>[] | null;
  wetlands: Record<string, unknown>[] | null;
  contamination: Record<string, unknown>[] | null;
  farmland: Record<string, unknown>[] | null;
  flood: Record<string, unknown>[] | null;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(v);
}

function ParcelFields({ attrs }: { attrs: Record<string, unknown> }) {
  const priorityKeys = ['PAMS_PIN', 'PROPCLASS', 'CALCACRES', 'OWNERNAME', 'ADDLINE1', 'MUNNAME', 'COUNTY', 'SALEDATE', 'SALEUSDVAL', 'ASSESSLAND', 'ASSESIMPROV'];
  const allKeys = Object.keys(attrs);
  const otherKeys = allKeys.filter(k => !priorityKeys.includes(k));
  const orderedKeys = [...priorityKeys.filter(k => allKeys.includes(k)), ...otherKeys];

  const labelMap: Record<string, string> = {
    PAMS_PIN: 'PAMS PIN',
    PROPCLASS: 'Property Class',
    CALCACRES: 'Acreage',
    OWNERNAME: 'Owner',
    ADDLINE1: 'Address',
    MUNNAME: 'Municipality',
    COUNTY: 'County',
    SALEDATE: 'Sale Date',
    SALEUSDVAL: 'Sale Value ($)',
    ASSESSLAND: 'Assessed Land ($)',
    ASSESIMPROV: 'Assessed Improvement ($)',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
      {orderedKeys.map(key => (
        <div key={key} className="flex gap-2 text-sm">
          <span className="text-gray-500 shrink-0 min-w-0 w-40 truncate" title={labelMap[key] || key}>{labelMap[key] || key}:</span>
          <span className="text-white break-all">{formatValue(attrs[key])}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ present, label }: { present: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg ${present ? 'text-red-400' : 'text-green-400'}`}>
        {present ? '✓' : '✗'}
      </span>
      <span className={`text-sm ${present ? 'text-red-300' : 'text-gray-400'}`}>
        {label}: <span className="font-medium">{present ? 'Present' : 'None found'}</span>
      </span>
    </div>
  );
}

export default function LookupPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleLookup() {
    if (!address.trim()) { setError('Enter an address'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setAddSuccess('');

    // Geocode
    let lat: number, lng: number, displayAddress: string;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', New Jersey, USA')}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) { setError('Address not found. Try a more specific NJ address.'); setLoading(false); return; }
      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
      displayAddress = geoData[0].display_name;
    } catch {
      setError('Geocoding failed. Check your internet connection.');
      setLoading(false);
      return;
    }

    setCoords({ lat, lng });
    setResolvedAddress(displayAddress);

    // Query NJ APIs
    try {
      const res = await fetch(`/api/lookup?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Failed to fetch property data.');
    }

    setLoading(false);
  }

  async function handleAddToMySites() {
    if (!result || !coords) return;
    setAdding(true);
    setAddSuccess('');

    const parcel = result.parcels?.[0];
    const payload = {
      address: parcel ? String(parcel.ADDLINE1 || address) : address,
      county: parcel ? String(parcel.COUNTY || '') : '',
      municipality: parcel ? String(parcel.MUNNAME || '') : '',
      township: '',
      acreage: parcel?.CALCACRES ? parseFloat(String(parcel.CALCACRES)) : null,
      sewer: '',
      dev_types: [],
      zoning: '',
      status: 'undecided',
      notes: '',
      lat: coords.lat,
      lng: coords.lng,
      nj_property_records_url: '',
      polygon_coords: [],
    };

    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setAddSuccess('Added to My Sites successfully!');
    } else {
      setAddSuccess('Failed to add site.');
    }
    setAdding(false);
  }

  const floodZone = result?.flood?.[0]
    ? String(result.flood[0].FLD_ZONE || result.flood[0].ZONE || result.flood[0].FLOODZONE || 'Present')
    : null;

  const highlandsZone = result?.highlands?.[0]
    ? String(result.highlands[0].ZONE || result.highlands[0].MGMT_AREA || result.highlands[0].LABEL || 'Present')
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white tracking-tight">Real Estate</h1>
          <nav className="hidden sm:flex gap-1">
            {NAV_LINKS.map(item => (
              item.active
                ? <span key={item.label} className="px-3 py-1 rounded text-sm bg-blue-700 text-white">{item.label}</span>
                : <a key={item.label} href={item.href} className="px-3 py-1 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800">{item.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h2 className="text-xl font-semibold text-white mb-1">Property Lookup</h2>
        <p className="text-gray-400 text-sm mb-6">Enter any NJ address to pull parcel, environmental, and zoning data from state databases.</p>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="e.g. 100 Main St, Princeton NJ"
            className="flex-1 bg-gray-800 text-white text-sm rounded px-4 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleLookup}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded text-sm font-medium transition-colors"
          >
            {loading ? 'Looking up...' : 'Look Up'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded p-3 mb-4">{error}</div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Querying NJ state databases...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Resolved address */}
            <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
              <span className="text-gray-500">Resolved: </span>{resolvedAddress}
              <span className="text-gray-600 ml-3">{coords?.lat.toFixed(6)}, {coords?.lng.toFixed(6)}</span>
            </div>

            {/* Parcel card */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <span className="text-white font-medium text-sm">Parcel Data</span>
                {result.parcels === null && <span className="text-xs text-yellow-500 ml-auto">Unavailable</span>}
              </div>
              <div className="p-4">
                {result.parcels === null ? (
                  <p className="text-gray-500 text-sm">Could not retrieve parcel data (service may be unavailable).</p>
                ) : result.parcels.length === 0 ? (
                  <p className="text-gray-500 text-sm">None found in this area.</p>
                ) : (
                  result.parcels.map((p, i) => (
                    <div key={i} className={i > 0 ? 'mt-4 pt-4 border-t border-gray-800' : ''}>
                      <ParcelFields attrs={p} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Environmental card */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <span className="text-white font-medium text-sm">Environmental</span>
              </div>
              <div className="p-4 space-y-3">
                {result.wetlands === null ? (
                  <div className="text-sm text-yellow-500">Wetlands: Unavailable</div>
                ) : (
                  <StatusBadge present={result.wetlands.length > 0} label="Wetlands" />
                )}

                {result.contamination === null ? (
                  <div className="text-sm text-yellow-500">Contaminated Sites: Unavailable</div>
                ) : (
                  <StatusBadge present={result.contamination.length > 0} label="Contaminated Sites" />
                )}

                {result.flood === null ? (
                  <div className="text-sm text-yellow-500">Flood Zone: Unavailable</div>
                ) : result.flood.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-lg">✗</span>
                    <span className="text-sm text-gray-400">Flood Zone: <span className="font-medium">None</span></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-lg">✓</span>
                    <span className="text-sm text-red-300">Flood Zone: <span className="font-medium">{floodZone}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* Restrictions card */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <span className="text-white font-medium text-sm">Restrictions &amp; Overlays</span>
              </div>
              <div className="p-4 space-y-3">
                {result.openSpace === null ? (
                  <div className="text-sm text-yellow-500">Green Acres / Open Space: Unavailable</div>
                ) : (
                  <StatusBadge present={result.openSpace.length > 0} label="Green Acres / Open Space" />
                )}

                {result.highlands === null ? (
                  <div className="text-sm text-yellow-500">NJ Highlands: Unavailable</div>
                ) : result.highlands.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-lg">✗</span>
                    <span className="text-sm text-gray-400">NJ Highlands: <span className="font-medium">None</span></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-lg">✓</span>
                    <span className="text-sm text-red-300">NJ Highlands: <span className="font-medium">{highlandsZone}</span></span>
                  </div>
                )}

                {result.farmland === null ? (
                  <div className="text-sm text-yellow-500">Preserved Farmland: Unavailable</div>
                ) : (
                  <StatusBadge present={result.farmland.length > 0} label="SADC Preserved Farmland" />
                )}
              </div>
            </div>

            {/* Add to My Sites */}
            <div className="pt-2">
              {addSuccess ? (
                <div className={`text-sm rounded p-3 text-center ${addSuccess.includes('success') ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
                  {addSuccess}
                </div>
              ) : (
                <button
                  onClick={handleAddToMySites}
                  disabled={adding}
                  className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded text-sm font-medium transition-colors"
                >
                  {adding ? 'Adding...' : '+ Add to My Sites'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
