import { SerperProvider } from '../search/serper';
import { GeminiProvider, GeminiIdea } from './providers/gemini';
import { Country, CountryDef } from '../countries/top100';

export interface IdeaCandidate extends GeminiIdea {
    raw_text: string;
    source_url: string;
    faceless_format: string; // Explicit override to ensure availability
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function researchCountry(country: CountryDef): Promise<IdeaCandidate[]> {
    const searcher = new SerperProvider();
    const synthesizer = new GeminiProvider();

    // 1. Define Deep Search Queries (15+)
    const baseQueries = [
        // English (Broad & Tech)
        `real estate marketing ideas ${country.name_en} 2025`,
        `best proptech startups for agents ${country.name_en}`,
        `faceless youtube content ideas for realtors ${country.name_en}`,
        `how to get real estate leads without cold calling ${country.name_en}`,
        `automated real estate lead generation ${country.name_en}`,
        `real estate instagram reels ideas ${country.name_en}`,
        `top real estate agents ${country.name_en} marketing strategy`,
        // Local Intent (Targeting ES/Local language nuances via name_es)
        // If name_es is different, it helps maximize local results
        `marketing inmobiliario tendencias ${country.name_es} 2025`,
        `herramientas para agentes inmobiliarios ${country.name_es}`,
        `ideas contenido inmobiliario sin salir en camara ${country.name_es}`,
        `captacion de exclusivas inmobiliarias automatizada ${country.name_es}`,
        `proptech startups ${country.name_es}`,
        `estrategias venta inmobiliaria ${country.name_es}`,
        `como vender pisos rapido ${country.name_es} estrategias`,
        `guiones de llamada inmobiliaria ${country.name_es}`
    ];

    let allResults: any[] = [];
    console.log(`[Research] Starting DEEP SEARCH (V3.2) for ${country.name_es} (${country.code}). Queries: ${baseQueries.length}`);

    // 2. Execute Deep Search Loop
    for (const [idx, q] of baseQueries.entries()) {
        try {
            if (idx > 0) {
                const delay = 1200 + Math.random() * 1000;
                await sleep(delay);
            }

            const results = await searcher.search(q, country.code, 20); // Deep fetch (20)
            allResults = [...allResults, ...results];
        } catch (e: any) {
            console.error(`Search failed for "${q}":`, e.message);
        }
    }

    // 3. Dedupe Results
    const uniqueResultsMap = new Map();
    allResults.forEach(item => {
        if (!item.url) return;
        const normalizedUrl = item.url.split('?utm')[0].split('#')[0].replace(/\/$/, '');
        if (!uniqueResultsMap.has(normalizedUrl)) {
            uniqueResultsMap.set(normalizedUrl, item);
        }
    });

    // Select Context for Gemini
    const uniqueList = Array.from(uniqueResultsMap.values());
    // Increased context limit for Rich Pearls
    const contextLimit = 75;
    const contextResults = uniqueList.slice(0, contextLimit);

    console.log(`[Research] Stats: Raw=${allResults.length}, Unique=${uniqueList.length}. Feeding Top ${contextResults.length} to Gemini.`);

    if (contextResults.length === 0) {
        console.warn('[Research] No results found. Returning empty.');
        return [];
    }

    // 4. Synthesize Rich Pearls
    console.log('[Research] Synthesizing Rich Pearls...');
    let ideas = await synthesizer.synthesizeIdeas(country.name_es, contextResults);

    // 5. Verification Sweep (Run 3.6.2 Enhanced)
    // Identify candidates falling short of Verification (2+ sources)
    const unverified = ideas.filter(i => i.sources.length < 2);
    console.log(`[Verification] Sweep needed for ${unverified.length} ideas...`);

    for (const [idx, idea] of unverified.entries()) {
        try {
            if (idx > 0) await sleep(1500);

            let confirmed = false;
            // Strategy: 3 Attempts with different query styles
            const strategies = [
                `${itemTitle(idea)} real estate ${country.name_en}`,
                `${country.name_en} real estate "${itemTitle(idea)}"`,
                `${itemTitle(idea)} marketing strategy real estate`
            ];

            const existingDomains = new Set(idea.sources.map(s => extractDomain(s)));

            for (const q of strategies) {
                if (confirmed) break;

                console.log(`[Verification] Checking: ${q}`);
                const vResults = await searcher.search(q, country.code, 10); // Increase to 10
                console.log(`[Verification] Found ${vResults.length} hits for "${q}"`);

                for (const r of vResults) {
                    const d = extractDomain(r.url);
                    if (!d) continue;

                    if (!existingDomains.has(d)) {
                        console.log(`[Verification] New Domain Candidate: ${d} (URL: ${r.url})`);
                        idea.sources.push(r.url);
                        existingDomains.add(d);
                        if (existingDomains.size >= 2) {
                            confirmed = true;
                            break;
                        }
                    }
                }

                if (!confirmed) await sleep(1000); // polite delay
            }

            if (confirmed) {
                console.log(`[Verification] SUCCESS: Promoted "${itemTitle(idea)}" to Verified.`);
                idea.verified = true;
                idea.evidence_count = idea.sources.length;
                idea.evidence_summary = `Verified via Sweep (${idea.sources.length} sources)`;
            } else {
                console.log(`[Verification] FAILED: "${itemTitle(idea)}" stays unverified.`);
                idea.evidence_summary = `Verification failed after ${strategies.length} strategies`;
            }

        } catch (e) {
            console.error(`[Verification] Error verifying "${itemTitle(idea)}":`, e);
        }
    }

    return ideas.map(idea => ({
        ...idea,
        source_url: idea.sources[0] || '',
        raw_text: JSON.stringify(idea)
    }));
}

function itemTitle(i: any): string {
    return i.name || i.title_es || 'Idea';
}

function extractDomain(url: string): string | null {
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '');
    } catch { return null; }
}
