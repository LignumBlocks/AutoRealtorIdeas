import { NextResponse } from 'next/server';
import { SerperProvider } from '@/lib/search/serper';
import { findCountryByCode, normalizeIdeaTitle } from '@/lib/countries/index';
import { researchCountry } from '@/lib/run-engine/research';
import { createOrLocateRootFolder, ensureSubfolders, getDriveClient } from '@/lib/google/drive';
import { createOrLocateSheet, ensureTabsAndHeaders, appendRows, getSheetsClient } from '@/lib/google/sheets';
import { generateFingerprint } from '@/lib/run-engine/providers/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { country_code, topic } = body;

        if (!country_code) return NextResponse.json({ ok: false, error: 'Missing country_code' }, { status: 400 });

        const country = findCountryByCode(country_code);
        if (!country) return NextResponse.json({ ok: false, error: 'Invalid country_code' }, { status: 400 });

        const rootFolderId = await createOrLocateRootFolder();
        const subfolders = await ensureSubfolders(rootFolderId);
        const sheetId = await createOrLocateSheet(rootFolderId);
        await ensureTabsAndHeaders(sheetId);

        const sheets = getSheetsClient();
        const existingFingerprints = new Set<string>();

        console.log(`[Run] Starting ${topic ? 'MVP TOPIC' : 'COUNTRY'} SEARCH for ${topic || country.name_es}...`);
        const rawCandidates = await researchCountry(country, topic);

        // Strict Verification
        let pearls = rawCandidates.filter(p => p.evidence_count >= 2 && p.verified);

        // Global Dedupe
        const uniquePearls: typeof pearls = [];
        pearls.forEach(p => {
            const fp = generateFingerprint(p);
            if (!existingFingerprints.has(fp)) {
                uniquePearls.push(p);
                existingFingerprints.add(fp);
            }
        });

        uniquePearls.sort((a, b) => b.overall_score - a.overall_score);

        // DE DETERMINISTIC SHORTLIST (3-5 items)
        const topPearls = uniquePearls.slice(0, 5);

        // MIAMI SATURATION CHECK (For shortlist only)
        const searcher = new SerperProvider();
        const PLATFORM_DOMAINS = ['youtube.com', 'eventbrite.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'twitter.com', 'x.com', 'reddit.com', 'pinterest.com'];

        for (const p of topPearls) {
            console.log(`[Saturation] Checking ${p.name}...`);
            const enResults = await searcher.search(`${p.name} real estate Miami`, 'US', 10);
            const esResults = await searcher.search(`${p.name} inmobiliaria Miami`, 'US', 10);
            const combined = [...enResults, ...esResults];

            const platforms: string[] = [];
            const competitors: string[] = [];

            combined.forEach(r => {
                const d = r.url?.split('/')[2]?.replace('www.', '');
                if (d && !d.includes('google')) {
                    const isPlatform = PLATFORM_DOMAINS.some(pd => d.includes(pd));
                    if (isPlatform) {
                        if (!platforms.includes(d)) platforms.push(d);
                    } else {
                        if (!competitors.includes(d)) competitors.push(d);
                    }
                }
            });

            const satScore = Math.min((platforms.length + competitors.length * 2) * 10, 100);
            const alreadyCommon: 'YES' | 'NO' | 'UNKNOWN' =
                competitors.length >= 5 ? 'YES' :
                    competitors.length >= 2 ? 'NO' :
                        'UNKNOWN';

            p.miami_saturation = {
                who_does_it: { platforms: platforms.slice(0, 3), competitors: competitors.slice(0, 5) },
                saturation_score: satScore,
                already_common: alreadyCommon
            };
        }

        console.log(`[Run] Result: Raw=${rawCandidates.length}, Verified=${pearls.length}, Shortlist=${topPearls.length}.`);

        const runId = `RUN_DS_${country.code}_${Date.now()}`;
        const runDate = new Date().toISOString();

        const drive = getDriveClient();
        let runFolderId = subfolders['02_Runs'];
        try {
            const folderMeta: any = {
                name: `${runDate.split('T')[0]}_${country.code}_${runId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [subfolders['02_Runs']]
            };
            if (process.env.DRIVE_SHARED_DRIVE_ID) folderMeta.supportsAllDrives = true;

            const folderRes = await drive.files.create({
                requestBody: folderMeta,
                fields: 'id',
                supportsAllDrives: !!process.env.DRIVE_SHARED_DRIVE_ID,
            });
            runFolderId = folderRes.data.id!;
        } catch (e) {
            console.error('Folder creation warning:', e);
        }

        // 1. Logs Tab (Runs)
        await appendRows(sheetId, 'Runs', [[
            runId, runDate, topic || country.name_es, country.region, 'miami-mvp-3.6.4',
            topPearls.length, rawCandidates.length, `Verified: ${pearls.length}`,
            '', sheetId, runDate
        ]]);

        // 2. Raw DB (Ideas)
        if (topPearls.length > 0) {
            const ideaRows = topPearls.map((p, idx) => [
                runId, runDate, country.name_es, idx + 1, 'Pearl', 'B2C',
                p.name, topic || 'Unknown', p.faceless_format, p.why_viral, p.description,
                p.monetization, 'Medium', 'DeepSearch', p.source_url,
                'Verified', runDate,
                // Run 2 Cols
                p.b2_model, p.faceless_fit, 0, p.selling_friction, p.cost_score,
                p.miami_fit, p.overall_score, p.is_top_pick, generateFingerprint(p),
                p.evidence_count, p.evidence_summary,
                // Run 2.4 Rich Cols
                JSON.stringify(p.execution_steps),
                JSON.stringify(p.faceless_script),
                JSON.stringify(p.monetization_options),
                p.friction_notes,
                p.cost_notes,
                '', // chat_md placeholder
                // Run 3.6.4 ProofPack (NEW)
                JSON.stringify(p.proof_pack),
                JSON.stringify(p.miami_saturation) // NEW COL
            ]);
            await appendRows(sheetId, 'Ideas', ideaRows);

            // Sources
            const sourceRows: any[][] = [];
            topPearls.forEach((p, idx) => {
                p.sources.forEach(url => {
                    sourceRows.push([
                        runId, runDate, country.name_es, idx + 1,
                        url, 'Web', 'Pearl Source', runDate
                    ]);
                });
            });
            await appendRows(sheetId, 'Sources', sourceRows);

            // 3. Populate LIBRARY_VIEW
            const libraryRows: any[][] = [];
            topPearls.forEach(p => {
                libraryRows.push([
                    p.overall_score,
                    country.name_es,
                    p.name,
                    p.why_viral,
                    p.description,
                    p.evidence_count,
                    p.sources.join(', '),
                    '', // chat_md
                    '', // miami_adapt
                    runDate,
                    runId,
                    JSON.stringify(p.proof_pack),
                    JSON.stringify(p.miami_saturation) // NEW COL
                ]);
            });
            if (libraryRows.length > 0) {
                await appendRows(sheetId, 'LIBRARY_VIEW', libraryRows);
            }
        }

        // 4. Populate COUNTRY_STATS
        const duration = (Date.now() - start) / 1000;
        await appendRows(sheetId, 'COUNTRY_STATS', [[
            runId, country.name_es, runDate,
            rawCandidates.length, pearls.length,
            topPearls.filter(p => p.is_top_pick).length,
            duration
        ]]);

        // Summary JSON
        await drive.files.create({
            requestBody: {
                name: 'pearls_summary.json',
                parents: [runFolderId],
            },
            media: {
                mimeType: 'application/json',
                body: JSON.stringify({
                    runId, date: runDate, country: country.name_es,
                    stats: { raw: rawCandidates.length, verified: pearls.length, written: topPearls.length },
                    pearls: topPearls
                }, null, 2)
            },
            supportsAllDrives: !!process.env.DRIVE_SHARED_DRIVE_ID,
        });

        return NextResponse.json({
            ok: true,
            runId,
            country: country.name_es,
            stats: {
                candidates: rawCandidates.length,
                verified: pearls.length,
                written: topPearls.length
            }
        });

    } catch (error: any) {
        console.error('Run failed:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
