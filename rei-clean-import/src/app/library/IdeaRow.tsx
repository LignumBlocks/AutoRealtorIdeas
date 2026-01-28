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
}

interface IdeaRowProps {
    idea: IdeaProps;
    onOpenChat: (idea: IdeaProps) => void;
}

export default function IdeaRow({ idea, onOpenChat }: IdeaRowProps) {
    const [expanded, setExpanded] = useState(false);

    const handleRowClick = () => {
        setExpanded(!expanded);
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenChat(idea);
    };

    return (
        <>
            <tr className="border-b hover:bg-gray-50 group cursor-pointer transition-colors" onClick={handleRowClick}>
                <td className="p-4 text-center">
                    <div className={`text-xl font-bold ${idea.overall_score >= 80 ? 'text-green-600' : 'text-gray-700'}`}>
                        {idea.overall_score}
                    </div>
                </td>
                <td className="p-4 font-medium text-gray-600">{idea.country}</td>
                <td className="p-4">
                    <div className="font-bold text-lg mb-1 flex items-center gap-2">
                        {idea.title}
                    </div>
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
                                <h4 className="font-bold text-blue-900 mb-1">Resumen</h4>
                                <p className="mb-4">{idea.summary}</p>

                                <h4 className="font-bold text-blue-900 mb-1">Fuentes</h4>
                                <ul className="list-disc pl-4 text-xs text-gray-500">
                                    {idea.sources.map((s, i) => (
                                        <li key={i}><a href={s} target="_blank" className="hover:underline truncate block">{s}</a></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border">
                                    <h4 className="font-bold text-purple-700 mb-1">¿Por qué es Perla?</h4>
                                    <p className="whitespace-pre-wrap">{idea.why_pearl}</p>
                                </div>
                                <p className="text-xs text-gray-500 italic">Click "Ver Chat" for full plan.</p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
