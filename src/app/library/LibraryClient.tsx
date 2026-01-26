'use client';

import { useState } from 'react';
import IdeaRow, { IdeaProps } from './IdeaRow';
import ChatModal from './ChatModal';
import ExperimentPackDrawer from './ExperimentPackDrawer';

export default function LibraryClient({ initialIdeas }: { initialIdeas: any[] }) {
    const [showAll, setShowAll] = useState(false);

    // Modal & Drawer State
    const [selectedIdea, setSelectedIdea] = useState<IdeaProps | null>(null);
    const [activePack, setActivePack] = useState<any | null>(null);
    const [selectedIdeaForPack, setSelectedIdeaForPack] = useState<any | null>(null);

    // Sort by Score
    // Filter: Verified Only (default) vs All
    const filteredIdeas = initialIdeas.filter(idea => {
        // Strict Verification: "Verified" status OR Evidence >= 2
        const isVerified = idea.verified_status !== 'False' && idea.evidence_count >= 2;

        if (showAll) return true; // Show everything if requested
        return isVerified;
    });

    const sortedIdeas = filteredIdeas.sort((a, b) => b.overall_score - a.overall_score);

    const handleGeneratePack = async (idea: IdeaProps) => {
        try {
            const res = await fetch('/api/generate-experiment-pack', {
                method: 'POST',
                body: JSON.stringify({
                    ideaTitle: idea.title,
                    ideaSummary: idea.summary,
                    country: idea.country
                })
            });
            const data = await res.json();
            if (data.ok) {
                setActivePack(data.pack);
                setSelectedIdeaForPack(idea);
            } else {
                alert(`Error generating pack: ${data.error}`);
            }
        } catch (e) {
            alert('Failed to generate experiment pack. Check network.');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Pearl Library</h1>
                    <p className="text-gray-500">Generated Ideas (Chat Mode Available)</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-200 px-4 py-2 rounded shadow hover:bg-gray-300">
                        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="w-4 h-4" />
                        <span className="text-sm font-bold text-gray-700">Show Unverified / All</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <span className="block text-sm text-blue-600 font-bold uppercase">Visible Pearls</span>
                    <span className="text-3xl font-bold text-blue-900">{filteredIdeas.length}</span>
                </div>
                <div className="bg-green-50 p-4 rounded border border-green-200">
                    <span className="block text-sm text-green-600 font-bold uppercase">Top Picks (&ge;80)</span>
                    <span className="text-3xl font-bold text-green-900">{filteredIdeas.filter((i: any) => i.overall_score >= 80).length}</span>
                </div>
            </div>

            <div className="bg-white rounded shadow text-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-4 w-24 text-center">Score</th>
                            <th className="p-4 w-32">Country</th>
                            <th className="p-4">Pearl Title (Es)</th>
                            <th className="p-4 w-32 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedIdeas.map((idea: any, i: number) => (
                            <IdeaRow
                                key={idea.fingerprint || i}
                                idea={idea}
                                onOpenChat={(i) => setSelectedIdea(i)}
                                onGeneratePack={handleGeneratePack}
                            />
                        ))}
                        {sortedIdeas.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No verified pearls found. Filter by "Show All" or run more searches.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals & Drawers */}
            {selectedIdea && (
                <ChatModal
                    idea={selectedIdea}
                    onClose={() => setSelectedIdea(null)}
                />
            )}

            {activePack && selectedIdeaForPack && (
                <ExperimentPackDrawer
                    idea={selectedIdeaForPack}
                    pack={activePack}
                    onClose={() => {
                        setActivePack(null);
                        setSelectedIdeaForPack(null);
                    }}
                />
            )}
        </div>
    );
}
