import { SerperProvider } from '../search/serper';
import { GeminiProvider, GeminiIdea } from './providers/gemini';
import { CountryDef } from '../countries/top100';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_LOG_PATH = path.join(process.cwd(), 'logs', 'debug_verify.log');

function logDebug(msg: string) {
    const timestamp = new Date().toISOString();
    const fullMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    try {
        if (!fs.existsSync(path.dirname(DEBUG_LOG_PATH))) {
            fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true });
        }
        fs.appendFileSync(DEBUG_LOG_PATH, fullMsg);
    } catch (e) {
        console.error('Failed to write to debug log:', e);
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface IdeaCandidate extends GeminiIdea {
    raw_text: string;
    source_url: string;
}

/**
 * Main research engine. 
 * In MVP SELLER_MIAMI_ES, this will be focused on the selected Topic/Dolor.
 */
export async function researchCountry(country: CountryDef, topic?: string): Promise<IdeaCandidate[]> {
    const searcher = new SerperProvider();
    const synthesizer = new GeminiProvider();

    // 1. Define Queries (MVP: Focus on Topic if provided)
    const baseQueries = topic ? [
        `${topic} real estate Miami`,
        `${topic} inmobiliaria Miami`,
        `${topic} homeowners problems Miami`,
        `how to sell property fast ${topic} Miami`,
        `marketing strategies for ${topic} sellers Miami`
    ] : [
        `real estate marketing ideas ${country.name_en} 2025`,
        `best proptech startups for agents ${country.name_en}`,
        `faceless youtube content ideas for realtors ${country.name_en}`,
        `how to get real estate leads without cold calling ${country.name_en}`,
        `automated real estate lead generation ${country.name_en}`,
        `real estate instagram reels ideas ${country.name_en}`,
        `marketing inmobiliario tendencias ${country.name_es} 2025`,
        `captacion de exclusivas inmobiliarias automatizada ${country.name_es}`
    ];

    let allResults: any[] = [];
    const targetName = topic || country.name_es;
    console.log(`[Research] Starting ${topic ? 'TOPIC' : 'COUNTRY'} SEARCH for ${targetName}. Queries: ${baseQueries.length}`);

    // 2. Execute Search Loop
    for (const [idx, q] of baseQueries.entries()) {
        try {
            if (idx > 0) await sleep(1200 + Math.random() * 1000);
            const results = await searcher.search(q, country.code, 20);
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
        if (!uniqueResultsMap.has(normalizedUrl)) uniqueResultsMap.set(normalizedUrl, item);
    });

    const uniqueList = Array.from(uniqueResultsMap.values());
    const contextResults = uniqueList.slice(0, 75);

    console.log(`[Research] Stats: Raw=${allResults.length}, Unique=${uniqueList.length}. Feeding to Gemini.`);

    if (contextResults.length === 0) return [];

    // 4. Synthesize Rich Pearls
    let ideas = await synthesizer.synthesizeIdeas(targetName, contextResults);

    // 5. Verification Sweep (MVP ProofPack)
    for (const [idx, idea] of ideas.entries()) {
        const itemTitle = idea.title_es || 'Idea';
        try {
            if (idx > 0) await sleep(1500);
            logDebug(`[Verify] title="${itemTitle}"`);

            const existingDomains = new Set(idea.sources.map(s => extractDomain(s)).filter(Boolean));

            // Initialization of evidence_items if not present
            if (!idea.proof_pack) {
                idea.proof_pack = { evidence_items: [], confidence_score: 0, gaps: [] };
            }

            // Strategy
            const stratQ = `${itemTitle} real estate ${topic || country.name_en}`;
            logDebug(`[Verify] query="${stratQ}"`);
            const vResults = await searcher.search(stratQ, country.code, 10);

            // Population of ProofPack Evidence (MVP REQUIREMENT B)
            const proofItems: any[] = [];
            const domainsFound = new Set<string>();

            for (const r of vResults) {
                const d = extractDomain(r.url);
                if (d && !domainsFound.has(d)) {
                    logDebug(`[Verify] accept domain=${d} url=${r.url}`);
                    proofItems.push({
                        url: r.url,
                        title: r.title,
                        domain: d,
                        type: 'Verified',
                        snippet: r.snippet
                    });
                    domainsFound.add(d);
                    if (!idea.sources.includes(r.url)) idea.sources.push(r.url);
                    if (domainsFound.size >= 4) break;
                }
            }

            idea.verified = domainsFound.size >= 2;
            idea.proof_pack = {
                evidence_items: proofItems,
                confidence_score: Math.min(domainsFound.size * 25, 100),
                gaps: domainsFound.size < 2 ? ["Need at least 2 independent verified domains."] : []
            };
            idea.evidence_count = proofItems.length;

            logDebug(`[Verify] RESULT verified=${idea.verified} confidence=${idea.proof_pack.confidence_score} count=${idea.evidence_count}`);

        } catch (e) {
            console.error(`[Verify] Error verifying "${itemTitle}":`, e);
        }
    }

    return ideas.map(idea => ({
        ...idea,
        source_url: idea.sources[0] || '',
        raw_text: JSON.stringify(idea)
    }));
}

function extractDomain(url: string): string | null {
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '');
    } catch { return null; }
}
