'use client';

import { useState, useEffect } from 'react';
import { Site } from './SiteMap';

const DEV_TYPES = ['Warehouse', 'Flex Warehouse', 'IOS', 'Truck Terminal', 'Residential', 'Storage', 'Mobile Home Park', 'RV Park', 'Data Center'];

const PIPELINE_STAGES = [
  { value: 'identified', label: 'Identified' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'called', label: 'Called' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'closed', label: 'Closed' },
  { value: 'dead', label: 'Dead' },
];

interface Props {
  site: Site | null;
  onClose: () => void;
  onUpdate: (site: Site) => void;
  onDelete: (id: number) => void;
}

export default function SiteDetail({ site, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Site>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (site) {
      setForm({ ...site });
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [site]);

  if (!site) return null;

  const devTypes = (() => {
    try { return JSON.parse(site.dev_types || '[]'); } catch { return []; }
  })();

  const formDevTypes = (() => {
    try { return JSON.parse((form.dev_types as string) || '[]'); } catch { return []; }
  })();

  async function updateStatus(status: 'yes' | 'no' | 'undecided') {
    const updated = { ...site!, status };
    const res = await fetch(`/api/sites/${site!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function updatePipelineStage(pipeline_stage: string) {
    const res = await fetch(`/api/sites/${site!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage }),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function saveNotes() {
    const updated = { ...site!, notes: form.notes };
    const res = await fetch(`/api/sites/${site!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/sites/${site!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { onUpdate(await res.json()); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    await fetch(`/api/sites/${site!.id}`, { method: 'DELETE' });
    onDelete(site!.id);
    onClose();
  }

  const toggleDevType = (dt: string) => {
    const curr = formDevTypes;
    const updated = curr.includes(dt) ? curr.filter((d: string) => d !== dt) : [...curr, dt];
    setForm({ ...form, dev_types: JSON.stringify(updated) });
  };

  const statusColors = {
    yes: 'bg-green-600 text-white',
    no: 'bg-red-600 text-white',
    undecided: 'bg-gray-600 text-white',
  };

  const statusBg = {
    yes: 'border-green-500',
    no: 'border-red-500',
    undecided: 'border-gray-500',
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 border-l-2 ${statusBg[site.status]} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-800">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="text-sm font-semibold text-white leading-tight line-clamp-2">{site.address}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {[site.municipality, site.county].filter(Boolean).join(', ') || 'No location data'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none flex-shrink-0">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Status</div>
          <div className="flex gap-2">
            {(['yes', 'undecided', 'no'] as const).map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                  site.status === s ? statusColors[s] : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s === 'yes' ? '✓ Yes' : s === 'no' ? '✗ No' : '? Undecided'}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Stage */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pipeline Stage</div>
          <select
            value={site.pipeline_stage || 'identified'}
            onChange={e => updatePipelineStage(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {PIPELINE_STAGES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {!editing ? (
          <>
            {/* Key Data */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Acreage', value: site.acreage ? `${site.acreage} ac` : '—' },
                { label: 'Sewer', value: site.sewer || '—' },
                { label: 'Zoning', value: site.zoning || '—' },
                { label: 'Township', value: site.township || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800 rounded p-2">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm text-white capitalize">{value}</div>
                </div>
              ))}
            </div>

            {/* Dev Types */}
            {devTypes.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dev Type</div>
                <div className="flex flex-wrap gap-1">
                  {devTypes.map((dt: string) => (
                    <span key={dt} className="bg-blue-900 text-blue-200 text-xs px-2 py-0.5 rounded">{dt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes</div>
              <textarea
                className="w-full bg-gray-800 text-sm text-white rounded p-2 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
                rows={4}
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                onBlur={saveNotes}
                placeholder="Add notes..."
              />
            </div>

            {/* NJ Property Records */}
            {site.nj_property_records_url && (
              <a
                href={site.nj_property_records_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs bg-blue-900 hover:bg-blue-800 text-blue-200 py-2 rounded transition-colors"
              >
                View NJ Property Records →
              </a>
            )}
          </>
        ) : (
          /* Edit Form */
          <div className="space-y-3">
            {[
              { label: 'Address', key: 'address', type: 'text' },
              { label: 'County', key: 'county', type: 'text' },
              { label: 'Municipality', key: 'municipality', type: 'text' },
              { label: 'Township', key: 'township', type: 'text' },
              { label: 'Acreage', key: 'acreage', type: 'number' },
              { label: 'Zoning', key: 'zoning', type: 'text' },
              { label: 'NJ Property Records URL', key: 'nj_property_records_url', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs text-gray-500">{label}</label>
                <input
                  type={type}
                  value={(form[key as keyof Site] as string) || ''}
                  onChange={e => setForm({ ...form, [key]: type === 'number' ? parseFloat(e.target.value) || null : e.target.value })}
                  className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none mt-0.5"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-500">Sewer</label>
              <select
                value={form.sewer || ''}
                onChange={e => setForm({ ...form, sewer: e.target.value })}
                className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 mt-0.5"
              >
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Dev Types</label>
              <div className="flex flex-wrap gap-1">
                {DEV_TYPES.map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => toggleDevType(dt)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      formDevTypes.includes(dt) ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {!editing ? (
          <>
            <button
              onClick={() => setEditing(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition-colors"
            >
              Edit Site
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300 text-sm py-2 rounded transition-colors"
              >
                Delete Site
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm py-2 rounded">Confirm Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded">Cancel</button>
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setForm({ ...site }); }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
