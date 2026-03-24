'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  async function handleImport() {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/import', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStatus('done');
      } else {
        setError(data.error || 'Import failed');
        setStatus('error');
      }
    } catch (e) {
      setError('Network error');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Import KML</h1>
        <p className="text-gray-400 text-sm mb-6">
          Imports all sites from your Google My Maps KML file.<br />
          <span className="text-gray-600 text-xs">All Property Map.kml from Desktop/Maps</span>
        </p>

        {status === 'idle' && (
          <button
            onClick={handleImport}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Import Sites from KML
          </button>
        )}

        {status === 'loading' && (
          <div className="text-gray-400 py-4">
            <div className="animate-pulse text-2xl mb-2">⏳</div>
            Importing sites... this may take a moment.
          </div>
        )}

        {status === 'done' && result && (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-800 rounded-lg p-4">
              <div className="text-green-400 text-4xl font-bold">{result.imported}</div>
              <div className="text-green-300 text-sm mt-1">Sites imported successfully</div>
              {result.skipped > 0 && (
                <div className="text-gray-500 text-xs mt-1">{result.skipped} skipped (duplicates or errors)</div>
              )}
            </div>
            <Link href="/" className="block w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors">
              View Sites →
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-sm">{error}</div>
            <button onClick={() => setStatus('idle')} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
              Try Again
            </button>
          </div>
        )}

        <Link href="/" className="block mt-4 text-gray-600 hover:text-gray-400 text-sm transition-colors">
          ← Back to Sites
        </Link>
      </div>
    </div>
  );
}
