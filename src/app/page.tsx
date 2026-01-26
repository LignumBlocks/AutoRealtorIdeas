'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Fetch status on load
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
      setStatus({ ok: false, error: 'Failed to fetch status' });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleInit = async () => {
    setLoading(true);
    setMsg('Initializing...');
    try {
      const res = await fetch('/api/init', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMsg(`Success! Created Folder: ${data.folderId}, Sheet: ${data.sheetId}`);
        fetchStatus();
      } else {
        setMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setLoading(true);
    setMsg('Testing Append...');
    try {
      const res = await fetch('/api/test-append', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMsg(`Success! Row added to Sheet. RunId: ${data.runId}`);
      } else {
        setMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 md:p-24 flex flex-col items-center gap-8 font-sans max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold">Auto Realtor Ideas</h1>

      {/* Setup Dashboard */}
      <div className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Drive Integration Status</h2>

        {!status ? (
          <p>Loading status...</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className={`p-4 rounded-lg border ${status.ok ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-red-50 border-red-200 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">Service Account:</span>
                <code>{status.serviceAccountEmail || 'Not Found / Key Missing'}</code>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-bold">Admin Email (Env):</span>
                <span>{status.env?.hasAdminEmail ? 'Configured ✅' : 'Missing ⚠️'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-bold">Search Provider:</span>
                <span>{status.env?.liveSearchProvider === 'SERPER' ? 'SERPER ✅' : 'OFF ❌'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-bold">Gemini Key:</span>
                <span>{status.env?.hasGeminiKey ? 'Configured ✅' : 'Missing ❌'}</span>
              </div>
              {status.authError && (
                <p className="text-red-600 mt-2 text-sm">{status.authError}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleInit}
                disabled={loading || !status.ok}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Working...' : 'Initialize Drive DB'}
              </button>

              <button
                onClick={handleTest}
                disabled={loading || !status.ok}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Append
              </button>
            </div>

            {msg && (
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                {msg}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full border-t my-4"></div>

      <p className="text-xl">Choose an action below:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <Link
          href="/new-run"
          className="p-6 border rounded-lg text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2">New Run &rarr;</h2>
          <p>Generate new marketing ideas.</p>
        </Link>

        <Link
          href="/library"
          className="p-6 border rounded-lg text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2">Library &rarr;</h2>
          <p>View past runs on Drive.</p>
        </Link>
      </div>
    </main>
  );
}
