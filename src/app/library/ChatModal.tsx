'use client';

import { useState, useEffect } from 'react';

interface ChatModalProps {
    idea: {
        title: string;
        fingerprint: string;
        chat_md?: string; // Pre-existing?
    };
    onClose: () => void;
}

export default function ChatModal({ idea, onClose }: ChatModalProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Prevent background scroll
        document.body.style.overflow = 'hidden';

        const fetchChat = async () => {
            // If we already passed content (maybe later), usage is instant. 
            // But for now, we assume we fetch if not provided.
            setLoading(true);
            try {
                const res = await fetch('/api/idea-chat', {
                    method: 'POST',
                    body: JSON.stringify({ fingerprint: idea.fingerprint })
                });
                const data = await res.json();
                if (data.ok) {
                    setContent(data.chat_md);
                } else {
                    setContent(`Error: ${data.error}`);
                }
            } catch (e) {
                setContent("Network Error");
            }
            setLoading(false);
        };

        fetchChat();

        return () => { document.body.style.overflow = 'unset'; };
    }, [idea.fingerprint]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{idea.title}</h3>
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Modo Chat IA (Mentor)</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 text-xl">
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 prose prose-sm max-w-none prose-headings:text-indigo-900 prose-p:text-gray-700 prose-li:text-gray-700">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-indigo-600 animate-pulse font-medium">Buscando o Generando reporte...</p>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap font-sans">
                            {content}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
