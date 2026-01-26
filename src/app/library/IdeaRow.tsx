'use client';

import { useState } from 'react';

export interface IdeaProps {
    country: string;
    type: string;
    title: string;
    summary: string;
    why_pearl: string;
    source_url: string;
    verified_status: string;
    overall_score: number;
    evidence_count: number;
    evidence_summary: string;
    fingerprint: string;
    miami_adapt: string | null;
    sources: string[];
    // JSON strings
    execution_steps_json?: string;
    script_json?: string;
    monetization_json?: string;
    friction_notes?: string;
    cost_notes?: string;
    proof_pack_json?: string;
}

interface IdeaRowProps {
    idea: IdeaProps;
    onOpenChat: (idea: IdeaProps) => void;
    onGeneratePack: (idea: IdeaProps) => void;
}

export default function IdeaRow({ idea, onOpenChat, onGeneratePack }: IdeaRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [genLoading, setGenLoading] = useState(false);

    const proofPack = idea.proof_pack_json ? JSON.parse(idea.proof_pack_json) : null;
    const confidence = proofPack?.confidence_score || idea.overall_score;

    const badge = confidence >= 85 ? { label: 'GOLD', class: 'bg-yellow-400 text-yellow-900' } :
        confidence >= 70 ? { label: 'CANDIDATE', class: 'bg-blue-100 text-blue-700' } :
            { label: 'IDEA', class: 'bg-gray-100 text-gray-600' };

    const handleRowClick = () => {
        setExpanded(!expanded);
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenChat(idea);
    };

    const handleGenClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setGenLoading(true);
        await onGeneratePack(idea);
        setGenLoading(false);
    };

    return (
        <>
            <tr className="border-b hover:bg-gray-50 group cursor-pointer transition-colors" onClick={handleRowClick}>
                <td className="p-4 text-center">
                    <div className={`text-xl font-bold ${confidence >= 80 ? 'text-green-600' : 'text-gray-700'}`}>
                        {confidence}
                    </div>
                    <div className={`text-[10px] font-bold mt-1 px-1 rounded inline-block ${badge.class}`}>
                        {badge.label}
                    </div>
                </td>
                <td className="p-4 font-medium text-gray-600">{idea.country}</td>
                <td className="p-4">
                    <div className="font-bold text-lg mb-1 flex items-center gap-2">
                        {idea.title}
                    </div>
                    {badge.label === 'CANDIDATE' && (
                        <div className="text-[10px] text-indigo-600 font-mono italic">
                            Next: Generate Exp Pack
                        </div>
                    )}
                </td>
                <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${idea.evidence_count >= 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {idea.evidence_count} Refs
                    </span>

                    {idea.verified_status !== 'False' && (
                        <div className="mt-3 flex flex-col gap-2 items-center">
                            <button
                                onClick={handleChatClick}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded shadow hover:bg-indigo-700 flex items-center gap-1 w-full justify-center"
                            >
                                💬 Ver Chat
                            </button>
                        </div>
                    )}
                </td>
            </tr>

            {/* Standard Expand (Quick View) */}
            {expanded && (
                <tr className="bg-gray-50 border-b">
                    <td colSpan={4} className="p-4 pl-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                            <div>
                                <h4 className="font-bold text-blue-900 mb-1 underline">Resumen Ejecutivo</h4>
                                <p className="mb-4">{idea.summary}</p>

                                {proofPack?.evidence_items?.length > 0 && (
                                    <>
                                        <h4 className="font-bold text-green-700 mb-1 mt-4">ProofPack: Evidencia Verificada ({proofPack.evidence_items.length})</h4>
                                        <div className="space-y-2 mb-4">
                                            {proofPack.evidence_items.map((item: any, i: number) => (
                                                <div key={i} className="bg-white p-2 border rounded text-xs">
                                                    <div className="font-bold text-blue-600 truncate">{item.title}</div>
                                                    <div className="text-gray-400 font-mono text-[10px]">{item.domain}</div>
                                                    <a href={item.url} target="_blank" className="text-blue-500 hover:underline">Ver fuente →</a>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <h4 className="font-bold text-blue-900 mb-1">Fuentes CRUDAS</h4>
                                <ul className="list-disc pl-4 text-xs text-gray-500">
                                    {idea.sources.map((s, i) => (
                                        <li key={i}><a href={s} target="_blank" className="hover:underline truncate block">{s}</a></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border">
                                    <h4 className="font-bold text-purple-700 mb-1">Estrategia Viral ("Why Pearl")</h4>
                                    <p className="whitespace-pre-wrap">{idea.why_pearl}</p>
                                </div>
                                {badge.label !== 'IDEA' && (
                                    <button
                                        onClick={handleGenClick}
                                        disabled={genLoading}
                                        className="w-full bg-indigo-50 text-indigo-700 font-bold py-2 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                    >
                                        {genLoading ? '⌛ Generando...' : '🚀 Elegir Perla y Generar Experiment Pack'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
