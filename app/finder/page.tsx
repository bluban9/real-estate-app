'use client';

import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Sites', href: '/' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Finder', href: '/finder', active: true },
  { label: 'Lookup', href: '/lookup' },
];

const NJ_COUNTIES = [
  'Atlantic', 'Bergen', 'Burlington', 'Camden', 'Cape May',
  'Cumberland', 'Essex', 'Gloucester', 'Hudson', 'Hunterdon',
  'Mercer', 'Middlesex', 'Monmouth', 'Morris', 'Ocean',
  'Passaic', 'Salem', 'Somerset', 'Sussex', 'Union', 'Warren',
];

interface FinderResult {
  attrs: Record<string, unknown>;
  lat: number | null;
  lng: number | null;
}

function formatAcreage(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const n = parseFloat(String(v));
  if (isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ac';
}

export default function FinderPage() {
  const [county, setCounty] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [minAcreage, setMinAcreage] = useState('');
  const [maxAcreage, setMaxAcreage] = useState('');
  const [propClass, setPropClass] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FinderResult[] | null>(null);
  const [count, setCount] = useState(0);

  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addErrors, setAddErrors] = useState<Set<number>>(new Set());

  async function handleSearch() {
    if (!county) { setError('Please select a county to search'); return; }
    setLoading(true);
    setError('');
    setResults(null);

    const params = new URLSearchParams({ county });
    if (municipality) params.set('municipality', municipality);
    if (minAcreage) params.set('minAcreage', minAcreage);
    if (maxAcreage) params.set('maxAcreage', maxAcreage);
    if (propClass) params.set('propClass', propClass);

    try {
      const res = await fetch(`/api/finder?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Search failed'); setLoading(false); return; }
      setResults(data.features || []);
      setCount(data.count || 0);
    } catch {
      setError('Search failed. Please try again.');
    }
    setLoading(false);
  }

  async function handleAdd(result: FinderResult, index: number) {
    setAddingId(index);
    const a = result.attrs;

    const payload = {
      address: String(a.ADDLINE1 || a.ADDR || '(No address)'),
      county: String(a.COUNTY || county),
      municipality: String(a.MUNNAME || ''),
      township: '',
      acreage: a.CALCACRES ? parseFloat(String(a.CALCACRES)) : null,
      sewer: '',
      dev_types: [],
      zoning: '',
      status: 'undecided',
      notes: `Owner: ${a.OWNERNAME || '—'} | Class: ${a.PROPCLASS || '—'} | PAMS: ${a.PAMS_PIN || '—'}`,
      lat: result.lat,
      lng: result.lng,
      nj_property_records_url: '',
      polygon_coords: [],
    };

    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setAddedIds(prev => new Set([...prev, index]));
    } else {
      setAddErrors(prev => new Set([...prev, index]));
    }
    setAddingId(null);
  }

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

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <h2 className="text-xl font-semibold text-white mb-1">Parcel Finder</h2>
        <p className="text-gray-400 text-sm mb-6">Search all NJ parcels by county, size, and property class. Up to 150 results.</p>

        {/* Search form */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">County <span className="text-red-400">*</span></label>
              <select
                value={county}
                onChange={e => setCounty(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a county...</option>
                {NJ_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Municipality (optional)</label>
              <input
                type="text"
                value={municipality}
                onChange={e => setMunicipality(e.target.value)}
                placeholder="e.g. Princeton"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Property Class</label>
              <select
                value={propClass}
                onChange={e => setPropClass(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="residential">Residential (1/2)</option>
                <option value="farm">Farm (3A/3B)</option>
                <option value="commercial">Commercial (4A/4B/4C)</option>
                <option value="industrial">Industrial (5A/5B)</option>
                <option value="vacant">Vacant (1)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Min Acreage</label>
              <input
                type="number"
                value={minAcreage}
                onChange={e => setMinAcreage(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Acreage</label>
              <input
                type="number"
                value={maxAcreage}
                onChange={e => setMaxAcreage(e.target.value)}
                placeholder="e.g. 100"
                min="0"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {loading ? 'Searching...' : 'Search Parcels'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded p-3 mb-4">{error}</div>
        )}

        {/* No county selected */}
        {!county && !results && !loading && !error && (
          <div className="text-center py-16 text-gray-500">
            <p>Select a county to start searching.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Querying NJ parcel database...</p>
            <p className="text-xs text-gray-600 mt-1">This may take up to 15 seconds</p>
          </div>
        )}

        {/* Results */}
        {results !== null && !loading && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-400">{count} result{count !== 1 ? 's' : ''} found</span>
              {count === 150 && <span className="text-xs text-yellow-500">(limit reached — narrow your search for more precise results)</span>}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p>No parcels found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, i) => {
                  const a = result.attrs;
                  const isAdded = addedIds.has(i);
                  const hasError = addErrors.has(i);
                  const isAdding = addingId === i;

                  return (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 mb-2">
                          <span className="text-white text-sm font-medium truncate">{String(a.ADDLINE1 || '(No address)')}</span>
                          {a.MUNNAME != null && <span className="text-gray-400 text-sm">{String(a.MUNNAME)}</span>}
                          {a.COUNTY != null && <span className="text-gray-500 text-sm">{String(a.COUNTY)}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span className="text-gray-400">
                            <span className="text-gray-600">Acres: </span>
                            <span className="text-gray-300">{formatAcreage(a.CALCACRES)}</span>
                          </span>
                          {a.PROPCLASS != null && (
                            <span className="text-gray-400">
                              <span className="text-gray-600">Class: </span>
                              <span className="text-gray-300">{String(a.PROPCLASS)}</span>
                            </span>
                          )}
                          {a.OWNERNAME != null && (
                            <span className="text-gray-400">
                              <span className="text-gray-600">Owner: </span>
                              <span className="text-gray-300 max-w-xs truncate inline-block align-bottom">{String(a.OWNERNAME)}</span>
                            </span>
                          )}
                          {a.PAMS_PIN != null && (
                            <span className="text-gray-600">PIN: {String(a.PAMS_PIN)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isAdded ? (
                          <span className="text-xs text-green-400 font-medium">Added ✓</span>
                        ) : hasError ? (
                          <span className="text-xs text-red-400">Failed</span>
                        ) : (
                          <button
                            onClick={() => handleAdd(result, i)}
                            disabled={isAdding}
                            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
                          >
                            {isAdding ? 'Adding...' : '+ My Sites'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
