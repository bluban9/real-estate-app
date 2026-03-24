'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Site } from '@/components/SiteMap';
import SiteDetail from '@/components/SiteDetail';
import AddSiteModal from '@/components/AddSiteModal';

const SiteMap = dynamic(() => import('@/components/SiteMap'), { ssr: false });

const DEV_TYPES = ['Warehouse', 'Flex Warehouse', 'IOS', 'Truck Terminal', 'Residential', 'Storage', 'Mobile Home Park', 'RV Park', 'Data Center'];

const STATUS_BADGE: Record<string, string> = {
  yes: 'bg-green-900 text-green-300',
  no: 'bg-red-900 text-red-300',
  undecided: 'bg-gray-800 text-gray-400',
};

const SEWER_BADGE: Record<string, string> = {
  yes: 'bg-blue-900 text-blue-300',
  no: 'bg-orange-900 text-orange-300',
  partial: 'bg-yellow-900 text-yellow-300',
};

export default function Home() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');

  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterSewer, setFilterSewer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDevType, setFilterDevType] = useState('');
  const [filterMinAcreage, setFilterMinAcreage] = useState('');

  const fetchSites = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCounty) params.set('county', filterCounty);
    if (filterSewer) params.set('sewer', filterSewer);
    if (filterStatus) params.set('status', filterStatus);
    if (filterDevType) params.set('devType', filterDevType);
    if (filterMinAcreage) params.set('minAcreage', filterMinAcreage);
    const res = await fetch(`/api/sites?${params}`);
    const data = await res.json();
    setSites(data);
    setLoading(false);
  }, [search, filterCounty, filterSewer, filterStatus, filterDevType, filterMinAcreage]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const counties = useMemo(() => {
    const all = sites.map(s => s.county).filter(Boolean);
    return [...new Set(all)].sort();
  }, [sites]);

  function handleSelect(site: Site) {
    setSelectedSite(site);
    if (site.lat && site.lng) setFlyTo([site.lat, site.lng]);
    if (view === 'list') setView('map');
  }

  function handleUpdate(updated: Site) {
    setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelectedSite(updated);
  }

  function handleDelete(id: number) {
    setSites(prev => prev.filter(s => s.id !== id));
    setSelectedSite(null);
  }

  function handleAdd(site: Site) {
    setSites(prev => [site, ...prev]);
    setSelectedSite(site);
  }

  const statCounts = useMemo(() => ({
    total: sites.length,
    yes: sites.filter(s => s.status === 'yes').length,
    no: sites.filter(s => s.status === 'no').length,
    undecided: sites.filter(s => s.status === 'undecided').length,
  }), [sites]);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <header className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white tracking-tight">Real Estate</h1>
          <nav className="hidden sm:flex gap-1">
            <span className="px-3 py-1 rounded text-sm bg-blue-700 text-white">Sites</span>
            <a href="/pipeline" className="px-3 py-1 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800">Pipeline</a>
            <a href="/finder" className="px-3 py-1 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800">Finder</a>
            <a href="/lookup" className="px-3 py-1 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800">Lookup</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="/import" className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors">
            Import KML
          </a>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded transition-colors font-medium"
          >
            + Add Site
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 text-xs">
        <span className="text-gray-400">{statCounts.total} sites</span>
        <span className="text-green-400">✓ {statCounts.yes} yes</span>
        <span className="text-red-400">✗ {statCounts.no} no</span>
        <span className="text-gray-500">? {statCounts.undecided} undecided</span>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <input
          type="text"
          placeholder="Search address, county, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none w-48 md:w-64"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700">
          <option value="">All Status</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="undecided">Undecided</option>
        </select>
        <select value={filterSewer} onChange={e => setFilterSewer(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700">
          <option value="">All Sewer</option>
          <option value="yes">Sewer Yes</option>
          <option value="no">Sewer No</option>
          <option value="partial">Sewer Partial</option>
        </select>
        <select value={filterDevType} onChange={e => setFilterDevType(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700">
          <option value="">All Dev Types</option>
          {DEV_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
        </select>
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700">
          <option value="">All Counties</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min acres"
          value={filterMinAcreage}
          onChange={e => setFilterMinAcreage(e.target.value)}
          className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700 w-24"
        />
        <div className="flex rounded overflow-hidden border border-gray-700 ml-auto">
          <button onClick={() => setView('map')} className={`px-3 py-1.5 text-xs ${view === 'map' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Map</button>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs ${view === 'list' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>List</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 overflow-hidden ${selectedSite ? 'hidden md:block' : ''}`}>
          {view === 'map' ? (
            loading
              ? <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
              : <SiteMap sites={sites} selectedId={selectedSite?.id || null} onSelect={handleSelect} flyTo={flyTo} />
          ) : (
            <div className="h-full overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 sticky top-0 z-10">
                  <tr>
                    {['Address', 'County', 'Acres', 'Sewer', 'Dev Type', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 px-4 py-2 font-medium border-b border-gray-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site, i) => {
                    const devTypes = (() => { try { return JSON.parse(site.dev_types || '[]'); } catch { return []; } })();
                    return (
                      <tr
                        key={site.id}
                        onClick={() => handleSelect(site)}
                        className={`cursor-pointer border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/30'} ${selectedSite?.id === site.id ? 'bg-blue-950' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-white max-w-xs truncate">{site.address}</td>
                        <td className="px-4 py-2.5 text-gray-400">{site.county || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400">{site.acreage ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {site.sewer ? <span className={`text-xs px-2 py-0.5 rounded ${SEWER_BADGE[site.sewer] || ''}`}>{site.sewer}</span> : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {devTypes.slice(0, 2).map((dt: string) => (
                              <span key={dt} className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">{dt}</span>
                            ))}
                            {devTypes.length > 2 && <span className="text-xs text-gray-500">+{devTypes.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${STATUS_BADGE[site.status] || ''}`}>{site.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && sites.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-16">No sites. Add one or <a href="/import" className="text-blue-400 hover:underline">import your KML</a>.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedSite && (
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0 overflow-hidden border-l border-gray-800">
            <SiteDetail site={selectedSite} onClose={() => setSelectedSite(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {showAdd && <AddSiteModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}
