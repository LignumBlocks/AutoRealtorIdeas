'use client';

import { useState, useEffect } from 'react';
import { MIAMI_DOLORES } from '@/lib/run-engine/miami-mvp';

// Using simple types since we fetch details
interface CountryItem { name_es: string; code: string; }

export default function NewRunPage() {
    const [status, setStatus] = useState<any>(null); // Env status
    const [logs, setLogs] = useState<string[]>([]);

    // Manual Run State
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CountryItem[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);
    const [selectedTopic, setSelectedTopic] = useState('HOA_CONDO_SHOCK'); // Default MVP topic
    const [manRunning, setManRunning] = useState(false);

    // Auto Run State
    const [autoStatus, setAutoStatus] = useState('IDLE');
    const [progress, setProgress] = useState({ current: 0, total: 100 });

    // Fetch Env Status
    useEffect(() => {
        fetch('/api/status').then(r => r.json()).then(setStatus);
    }, []);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);

    // Autocomplete Logic
    const handleSearch = (txt: string) => {
        setQuery(txt);
        // Reset selection if user types
        if (selectedCountry && txt !== selectedCountry.name_es) {
            setSelectedCountry(null);
        }

        if (txt.length > 1) {
            fetch(`/api/countries?q=${txt}`).then(r => r.json()).then(res => setSuggestions(res));
        } else {
            setSuggestions([]);
        }
    };

    const selectCountry = (c: CountryItem) => {
        setQuery(c.name_es);
        setSelectedCountry(c);
        setSuggestions([]);
    };

    // Manual Run
    const runManual = async () => {
        if (!selectedCountry) {
            alert('Please select a country from the dropdown.');
            return;
        }
        setManRunning(true);
        addLog(`Started MVP Run: ${selectedCountry.name_es} | Topic: ${selectedTopic}`);
        try {
            const res = await fetch('/api/run-country', {
                method: 'POST',
                body: JSON.stringify({
                    country_code: selectedCountry.code,
                    topic: selectedTopic
                })
            });
            const data = await res.json();
            if (data.ok) {
                addLog(`✅ Success: ${data.stats.written} Pearls in Shortlist (Found ${data.stats.verified} Verified)`);
            } else {
                addLog(`❌ Failed: ${data.error}`);
            }
        } catch (e) {
            addLog(`Error: Network`);
        }
        setManRunning(false);
    };

    // Auto Run Controls
    const startAutoRun = async () => {
        if (!confirm('Start Full Top 100 Run? This will reset progress.')) return;
        await fetch('/api/auto-run/start', { method: 'POST', body: JSON.stringify({ reset: true }) });
        addLog('Started Top100 Auto-Run...');
    };

    const stopAutoRun = async () => {
        await fetch('/api/auto-run/stop', { method: 'POST' });
        addLog('Stopping Auto-Run...');
    };

    // Auto Run Loop
    useEffect(() => {
        let mounted = true;
        let timeout: any;

        const loop = async () => {
            try {
                const res = await fetch('/api/auto-run/status');
                const data = await res.json();
                if (!mounted) return;

                setAutoStatus(data.status);
                setProgress({ current: data.cursor, total: data.total });

                if (data.status === 'RUNNING' && data.nextCountry) {
                    const nc = data.nextCountry;
                    addLog(`🤖 Auto-Runner: Processing #${data.cursor + 1} ${nc.name} (${nc.code})...`);

                    let success = false;
                    try {
                        const runRes = await fetch('/api/run-country', {
                            method: 'POST',
                            body: JSON.stringify({ country_code: nc.code })
                        });
                        const runData = await runRes.json();
                        if (runData.ok) {
                            addLog(`   -> Done. Written: ${runData.stats?.written || 0}`);
                            success = true;
                        } else {
                            addLog(`   -> Error: ${runData.error}`);
                        }
                    } catch (e) {
                        addLog(`   -> Network Error`);
                    }

                    await fetch('/api/auto-run/status', {
                        method: 'POST',
                        body: JSON.stringify({ success, country_code: nc.code })
                    });

                    timeout = setTimeout(loop, 2000);
                } else if (data.finished) {
                    addLog('🎉 Auto-Run Completed Top 100!');
                    timeout = setTimeout(loop, 5000);
                } else {
                    timeout = setTimeout(loop, 3000);
                }

            } catch (e) {
                console.error(e);
                timeout = setTimeout(loop, 5000);
            }
        };

        loop();
        return () => { mounted = false; clearTimeout(timeout); };
    }, []);

    const providerBadge = status?.env?.liveSearchProvider === 'SERPER'
        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded ml-2">LIVE SEARCH: SERPER ✅</span>
        : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded ml-2">SEARCH OFF ❌</span>;

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-black">Run Manager</h1>

                {/* Auto Run Dashboard */}
                <div className="bg-white p-6 rounded-lg shadow mb-8 border border-blue-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-blue-900">Auto-Runner (Top 100)</h2>
                        <span className={`px-3 py-1 rounded font-mono ${autoStatus === 'RUNNING' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                            {autoStatus}
                        </span>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1 text-black">
                            <span>Progress: {progress.current} / {progress.total} Countries</span>
                            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {autoStatus !== 'RUNNING' ? (
                            <button onClick={startAutoRun} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold">
                                RUN TOP 100 (FULL)
                            </button>
                        ) : (
                            <button onClick={stopAutoRun} className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 font-bold">
                                PAUSE / STOP
                            </button>
                        )}
                    </div>
                </div>

                {/* Manual Controls */}
                <div className="bg-white p-6 rounded-lg shadow mb-8 text-black">
                    <h2 className="text-xl font-semibold mb-4 text-black">MVP Seller Run (ES)</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-blue-900 mb-2">🎯 1. Selecciona Dolor Miami (Topic)</label>
                        <select
                            className="w-full border p-3 rounded bg-blue-50 font-bold"
                            value={selectedTopic}
                            onChange={e => setSelectedTopic(e.target.value)}
                        >
                            {MIAMI_DOLORES.map(d => (
                                <option key={d.id} value={d.id}>{d.label} - {d.description}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">🌎 2. Selecciona Contexto (País base para Perlas)</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            placeholder="Type to search..."
                            value={query}
                            onChange={e => handleSearch(e.target.value)}
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-60 overflow-y-auto">
                                {suggestions.map(c => (
                                    <li key={c.code}
                                        className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between"
                                        onMouseDown={() => selectCountry(c)} // onMouseDown fires before Blur
                                    >
                                        <span className="font-bold">{c.name_es}</span>
                                        <span className="text-gray-400 text-sm font-mono">{c.code}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        onClick={runManual}
                        disabled={!selectedCountry || manRunning || status?.env?.liveSearchProvider !== 'SERPER'}
                        className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                    >
                        {manRunning ? 'Running Deep Search...' : `Run Country: ${selectedCountry?.name_es || '(None)'}`}
                    </button>
                </div>

                {/* Logs Console */}
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow font-mono text-sm h-64 overflow-y-auto">
                    <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1">System Logs</div>
                    {logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        </main>
    );
}
