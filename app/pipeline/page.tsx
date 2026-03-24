'use client';

import { useState, useEffect, useCallback } from 'react';
import { Site } from '@/components/SiteMap';
import SiteDetail from '@/components/SiteDetail';

const NAV_LINKS = [
  { label: 'Sites', href: '/' },
  { label: 'Pipeline', href: '/pipeline', active: true },
  { label: 'Finder', href: '/finder' },
  { label: 'Lookup', href: '/lookup' },
];

interface Stage {
  value: string;
  label: string;
  color: string;
  headerColor: string;
}

const STAGES: Stage[] = [
  { value: 'identified',     label: 'Identified',      color: 'border-gray-600',   headerColor: 'bg-gray-800 text-gray-300' },
  { value: 'reviewed',       label: 'Reviewed',        color: 'border-blue-700',   headerColor: 'bg-blue-900/60 text-blue-300' },
  { value: 'called',         label: 'Called',          color: 'border-yellow-600', headerColor: 'bg-yellow-900/60 text-yellow-300' },
  { value: 'negotiating',    label: 'Negotiating',     color: 'border-orange-600', headerColor: 'bg-orange-900/60 text-orange-300' },
  { value: 'under_contract', label: 'Under Contract',  color: 'border-green-600',  headerColor: 'bg-green-900/60 text-green-300' },
  { value: 'closed',         label: 'Closed',          color: 'border-teal-600',   headerColor: 'bg-teal-900/60 text-teal-300' },
  { value: 'dead',           label: 'Dead',            color: 'border-red-700',    headerColor: 'bg-red-900/60 text-red-300' },
];

const STATUS_BADGE: Record<string, string> = {
  yes: 'bg-green-900 text-green-300',
  no: 'bg-red-900 text-red-300',
  undecided: 'bg-gray-800 text-gray-400',
};

export default function PipelinePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/sites');
    const data = await res.json();
    setSites(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  function handleUpdate(updated: Site) {
    setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelectedSite(updated);
  }

  function handleDelete(id: number) {
    setSites(prev => prev.filter(s => s.id !== id));
    setSelectedSite(null);
  }

  async function handleStageChange(site: Site, newStage: string) {
    setMovingId(site.id);
    const res = await fetch(`/api/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
      if (selectedSite?.id === updated.id) setSelectedSite(updated);
    }
    setMovingId(null);
  }

  function getSitesForStage(stageValue: string): Site[] {
    return sites.filter(s => (s.pipeline_stage || 'identified') === stageValue);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-950">
        <PipelineHeader />
        <div className="flex items-center justify-center flex-1 text-gray-500">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <PipelineHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {STAGES.map(stage => {
              const stageSites = getSitesForStage(stage.value);
              return (
                <div key={stage.value} className={`flex flex-col w-64 flex-shrink-0 rounded-lg border ${stage.color} bg-gray-900 overflow-hidden`}>
                  {/* Column header */}
                  <div className={`px-3 py-2.5 flex items-center justify-between flex-shrink-0 ${stage.headerColor}`}>
                    <span className="text-sm font-medium">{stage.label}</span>
                    <span className="text-xs opacity-70 bg-black/20 px-1.5 py-0.5 rounded-full">{stageSites.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageSites.length === 0 && (
                      <p className="text-gray-700 text-xs text-center pt-4">No sites</p>
                    )}
                    {stageSites.map(site => {
                      const devTypes = (() => { try { return JSON.parse(site.dev_types || '[]'); } catch { return []; } })();
                      const isSelected = selectedSite?.id === site.id;
                      const isMoving = movingId === site.id;

                      return (
                        <div
                          key={site.id}
                          onClick={() => setSelectedSite(isSelected ? null : site)}
                          className={`rounded-lg p-3 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-blue-950 border-blue-700'
                              : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                          } ${isMoving ? 'opacity-50' : ''}`}
                        >
                          {/* Address */}
                          <div className="text-white text-xs font-medium leading-tight line-clamp-2 mb-2">
                            {site.address}
                          </div>

                          {/* Acreage */}
                          {site.acreage && (
                            <div className="text-gray-400 text-xs mb-2">{site.acreage} ac</div>
                          )}

                          {/* Dev type tags */}
                          {devTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {devTypes.slice(0, 2).map((dt: string) => (
                                <span key={dt} className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">{dt}</span>
                              ))}
                              {devTypes.length > 2 && <span className="text-xs text-gray-600">+{devTypes.length - 2}</span>}
                            </div>
                          )}

                          {/* Bottom row: status + stage dropdown */}
                          <div className="flex items-center justify-between gap-1" onClick={e => e.stopPropagation()}>
                            <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${STATUS_BADGE[site.status] || ''}`}>
                              {site.status}
                            </span>
                            <select
                              value={site.pipeline_stage || 'identified'}
                              onChange={e => handleStageChange(site, e.target.value)}
                              disabled={isMoving}
                              className="text-xs bg-gray-700 text-gray-300 rounded px-1 py-0.5 border border-gray-600 focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              {STAGES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedSite && (
          <div className="w-80 lg:w-96 flex-shrink-0 border-l border-gray-800 overflow-hidden">
            <SiteDetail
              site={selectedSite}
              onClose={() => setSelectedSite(null)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineHeader() {
  return (
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
  );
}
