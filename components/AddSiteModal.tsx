'use client';

import { useState } from 'react';
import { Site } from './SiteMap';

const DEV_TYPES = ['Warehouse', 'Flex Warehouse', 'IOS', 'Truck Terminal', 'Residential', 'Storage', 'Mobile Home Park', 'RV Park', 'Data Center'];

interface Props {
  onClose: () => void;
  onAdd: (site: Site) => void;
}

export default function AddSiteModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    address: '', county: '', municipality: '', township: '',
    acreage: '', sewer: '', dev_types: [] as string[],
    zoning: '', status: 'undecided', notes: '', nj_property_records_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleDevType = (dt: string) => {
    setForm(f => ({
      ...f,
      dev_types: f.dev_types.includes(dt) ? f.dev_types.filter(d => d !== dt) : [...f.dev_types, dt],
    }));
  };

  async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', New Jersey, USA')}&limit=1`);
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {}
    return null;
  }

  async function handleSubmit() {
    if (!form.address.trim()) { setError('Address is required'); return; }
    setSaving(true);
    setError('');

    const coords = await geocode(form.address);

    const payload = {
      ...form,
      acreage: form.acreage ? parseFloat(form.acreage) : null,
      dev_types: form.dev_types,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
    };

    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      onAdd(await res.json());
      onClose();
    } else {
      setError('Failed to save site');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Add New Site</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-4 space-y-3">
          {error && <div className="bg-red-900/50 text-red-300 text-sm p-2 rounded">{error}</div>}

          {[
            { label: 'Address *', key: 'address', placeholder: '123 Main St, Princeton NJ' },
            { label: 'County', key: 'county', placeholder: 'Somerset' },
            { label: 'Municipality', key: 'municipality', placeholder: 'Princeton' },
            { label: 'Township', key: 'township', placeholder: 'Princeton Township' },
            { label: 'Zoning', key: 'zoning', placeholder: 'R-3' },
            { label: 'NJ Property Records URL', key: 'nj_property_records_url', placeholder: 'https://njpropertyrecords.com/...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none mt-0.5"
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-500">Acreage</label>
            <input
              type="number"
              placeholder="100"
              value={form.acreage}
              onChange={e => setForm({ ...form, acreage: e.target.value })}
              className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none mt-0.5"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Sewer</label>
            <select
              value={form.sewer}
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
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 mt-0.5"
            >
              <option value="undecided">Undecided</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
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
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    form.dev_types.includes(dt) ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none mt-0.5 resize-none"
              placeholder="Any notes about this site..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Site'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
