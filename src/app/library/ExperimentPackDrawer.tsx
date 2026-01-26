'use client';

import { useState } from 'react';

interface ExperimentPackDrawerProps {
    idea: any;
    pack: any;
    onClose: () => void;
}

export default function ExperimentPackDrawer({ idea, pack, onClose }: ExperimentPackDrawerProps) {
    const [copiedSec, setCopiedSec] = useState<string | null>(null);

    const handleCopy = (text: string, section: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSec(section);
        setTimeout(() => setCopiedSec(null), 2000);
    };

    const sectionClass = "mb-8 p-4 bg-white rounded border border-gray-200 shadow-sm relative";
    const titleClass = "text-lg font-bold text-blue-900 mb-3 border-b pb-1";
    const copyBtnClass = "absolute top-4 right-4 text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 border";

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-gray-50 shadow-2xl z-[100] overflow-y-auto border-l border-indigo-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-indigo-900 text-white p-6 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Experiment Pack: {idea.title}</h2>
                    <p className="text-xs text-indigo-200">7-Day Miami Market Saturation Plan</p>
                </div>
                <button onClick={onClose} className="text-2xl hover:text-red-400">&times;</button>
            </div>

            <div className="p-6">
                {/* 1. Landing Copy */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>🏠 Landing Page Copy</h3>
                    <button
                        onClick={() => handleCopy(JSON.stringify(pack.landing_copy, null, 2), 'landing')}
                        className={copyBtnClass}
                    >
                        {copiedSec === 'landing' ? '✅ Copied' : '📋 Copy All'}
                    </button>
                    <div className="space-y-4 text-sm">
                        <div className="font-bold text-indigo-600">Headlines:</div>
                        <ul className="list-disc pl-5 space-y-1">
                            {pack.landing_copy.headlines.map((h: string, i: number) => <li key={i}>{h}</li>)}
                        </ul>
                        <div className="font-bold text-indigo-600">Bullets:</div>
                        <ul className="list-disc pl-5 space-y-1">
                            {pack.landing_copy.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                        </ul>
                        <div className="font-bold text-indigo-600 mt-4">FAQ (Completeness Check):</div>
                        <div className="space-y-2">
                            {pack.landing_copy.faq?.map((f: any, i: number) => (
                                <details key={i} className="bg-gray-50 p-2 rounded border">
                                    <summary className="font-bold cursor-pointer text-[10px]">{f.q}</summary>
                                    <p className="text-[10px] mt-1 text-gray-600">{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Shorts Scripts */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>🎬 Guiones para Shorts/Reels</h3>
                    {pack.shorts_scripts.map((s: any, i: number) => (
                        <div key={i} className="mb-6 last:mb-0 bg-blue-50 p-3 rounded">
                            <div className="font-bold mb-2 flex justify-between">
                                <span>{s.title}</span>
                                <button onClick={() => handleCopy(`${s.hook}\n\n${s.body}\n\n${s.cta}`, `script_${i}`)} className="text-[10px] text-blue-700 underline">Copy Script</button>
                            </div>
                            <div className="text-xs space-y-2">
                                <p><strong>Hook:</strong> {s.hook}</p>
                                <p><strong>Body:</strong> {s.body}</p>
                                <p><strong>CTA:</strong> {s.cta}</p>
                                <p className="italic text-gray-500">Caption: {s.caption}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. WhatsApp Scripts */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>💬 Secuencia WhatsApp</h3>
                    <div className="space-y-4 text-xs">
                        <div>
                            <div className="font-bold uppercase mb-1">Día 0: Primer Contacto</div>
                            <div className="p-2 border rounded bg-gray-50">{pack.whatsapp_scripts.first_reply}</div>
                        </div>
                        <div>
                            <div className="font-bold uppercase mb-1">Día 1: Seguimiento (24h)</div>
                            <div className="p-2 border rounded bg-gray-50">{pack.whatsapp_scripts.followup_24h}</div>
                        </div>
                        <div>
                            <div className="font-bold uppercase mb-1">Día 3: Seguimiento (72h)</div>
                            <div className="p-2 border rounded bg-gray-50">{pack.whatsapp_scripts.followup_72h}</div>
                        </div>
                    </div>
                </div>

                {/* 4. Tracking & Metrics */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>📊 Objetivos de la Campaña</h3>
                    <div className="text-sm">
                        <p className="font-bold mb-2 text-green-700">{pack.metrics_tracker.goal}</p>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-green-50 p-2 text-center rounded border border-green-100">
                                <div className="text-[10px] uppercase">Opt-ins</div>
                                <div className="text-xl font-bold">{pack.metrics_tracker.target_optins}</div>
                            </div>
                            <div className="bg-green-50 p-2 text-center rounded border border-green-100">
                                <div className="text-[10px] uppercase">Convos</div>
                                <div className="text-xl font-bold">{pack.metrics_tracker.target_convos}</div>
                            </div>
                            <div className="bg-green-50 p-2 text-center rounded border border-green-100">
                                <div className="text-[10px] uppercase">Citas</div>
                                <div className="text-xl font-bold">{pack.metrics_tracker.target_citas}</div>
                            </div>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="text-[10px] p-2 bg-yellow-50 rounded border border-yellow-100">
                                <div className="font-bold text-yellow-800 uppercase">Señal Débil (Weak Signal):</div>
                                <p>{pack.metrics_tracker.weak_signal}</p>
                            </div>
                            <div className="text-[10px] p-2 bg-blue-50 rounded border border-blue-100">
                                <div className="font-bold text-blue-800 uppercase">Iterar si aparece:</div>
                                <p>{pack.metrics_tracker.iterate_if}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Distribution Checklist */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>🚀 Checklist de Distribución</h3>
                    <ul className="space-y-2 text-xs">
                        {pack.distribution_checklist?.map((c: string, i: number) => (
                            <li key={i} className="flex gap-2 bg-gray-50 p-2 rounded">
                                <input type="checkbox" className="mt-1" />
                                <span>{c}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 6. Compliance */}
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded text-[10px] italic text-red-800 font-bold">
                    ⚠️ PROOF DE CUMPLIMIENTO (RE-WRITTEN): {pack.compliance_block}
                </div>

                {/* 7. Iteration Plan */}
                <div className={sectionClass}>
                    <h3 className={titleClass}>🔄 Plan de Iteración y Criterio Kill</h3>
                    <div className="text-xs space-y-3">
                        <div>
                            <div className="font-bold text-indigo-700">Si hay pocos Opt-ins:</div>
                            <p>{pack.iteration_plan?.if_low_optins}</p>
                        </div>
                        <div>
                            <div className="font-bold text-indigo-700">Si hay pocas Conversaciones:</div>
                            <p>{pack.iteration_plan?.if_low_convos}</p>
                        </div>
                        <div>
                            <div className="font-bold text-indigo-700">Si no hay Citas:</div>
                            <p>{pack.iteration_plan?.if_no_citas}</p>
                        </div>
                        <div className="p-2 bg-red-900 text-white rounded font-bold">
                            <div className="uppercase text-[9px]">Criterio Kill (Cuándo abandonar):</div>
                            <p>{pack.iteration_plan?.kill_criteria}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 pt-0">
                <button onClick={onClose} className="w-full bg-gray-900 text-white font-bold py-3 rounded">
                    Cerrar Panel
                </button>
            </div>
        </div>
    );
}
