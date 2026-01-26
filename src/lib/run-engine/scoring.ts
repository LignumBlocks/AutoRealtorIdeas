import { IdeaCandidate } from './research';
import { Country } from '../country-list/seed';

export interface ScoredIdea extends IdeaCandidate {
    // These properties are now inherited from IdeaCandidate (via GeminiIdea), 
    // but we re-declare to ensure they exist for the rest of the app.
    faceless_score: number;
    automation_score: number;
    selling_friction: number;
    cost_score: number;
    miami_fit: number;
    overall_score: number;
    is_top_pick: boolean;
}

export function scoreIdeas(candidates: IdeaCandidate[], country: Country): ScoredIdea[] {
    return candidates.map(c => {
        // If Gemini provided scores, use them. Else (fallback), use defaults.
        // Since we are using GeminiProvider, these should be populated.

        // Safety check if something is missing
        const safeCandidate = {
            ...c,
            faceless_score: c.faceless_score ?? (Number(c.faceless_format === 'High') ? 5 : 3),
            automation_score: 0, // Not in Gemini schema explicitly as separate field, but we can treat as derived
            selling_friction: c.selling_friction ?? 3,
            cost_score: c.cost_score ?? 3,
            miami_fit: c.miami_fit ?? 3,
            overall_score: c.overall_score ?? 50,
            is_top_pick: c.is_top_pick ?? false
        };

        return safeCandidate as ScoredIdea;
    }).sort((a, b) => b.overall_score - a.overall_score);
}
