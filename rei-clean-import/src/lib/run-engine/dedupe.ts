import crypto from 'crypto';
import { ScoredIdea } from './scoring';

export interface DedupeResult {
    unique: ScoredIdea[];
    duplicates: ScoredIdea[];
}

export function generateFingerprint(idea: ScoredIdea): string {
    // Fingerprint based on core concept, robust to minor title variations
    // Ideally use normalized core keywords. Simple hash for now.
    const input = `${idea.name.toLowerCase().trim()}|${idea.source_url.trim()}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Filter out candidates that already exist in the known fingerprints set.
 */
export function dedupeIdeas(ideas: ScoredIdea[], existingFingerprints: Set<string>): DedupeResult {
    const unique: ScoredIdea[] = [];
    const duplicates: ScoredIdea[] = [];
    const newFingerprints = new Set<string>();

    for (const idea of ideas) {
        const fp = generateFingerprint(idea);

        // Check global index AND current batch
        if (existingFingerprints.has(fp) || newFingerprints.has(fp)) {
            duplicates.push(idea);
        } else {
            unique.push(idea);
            newFingerprints.add(fp);
        }
    }

    return { unique, duplicates };
}
