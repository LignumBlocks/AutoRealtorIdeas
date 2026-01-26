import { NextResponse } from 'next/server';
import { findCountryByCode, normalizeIdeaTitle } from '@/lib/countries/index';
import { researchCountry } from '@/lib/run-engine/research';
import { createOrLocateRootFolder, ensureSubfolders, getDriveClient } from '@/lib/google/drive';
import { createOrLocateSheet, ensureTabsAndHeaders, appendRows, getSheetsClient } from '@/lib/google/sheets';
import { generateFingerprint } from '@/lib/run-engine/dedupe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { country_code } = body;

        if (!country_code) return NextResponse.json({ ok: false, error: 'Missing country_code' }, { status: 400 });

        const country = findCountryByCode(country_code);
        if (!country) return NextResponse.json({ ok: false, error: 'Invalid country_code' }, { status: 400 });

        const rootFolderId = await createOrLocateRootFolder();
        const subfolders = await ensureSubfolders(rootFolderId);
        const sheetId = await createOrLocateSheet(rootFolderId);
        await ensureTabsAndHeaders(sheetId);

        const sheets = getSheetsClient();
        const ideasRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Ideas!Z:Z', // Fingerprint Col is Z
        });
        const existingFingerprints = new Set<string>(
            ideasRes.data.values?.flat() || []
        );

        console.log(`[Run] Starting DEEP SEARCH (Pearl Hunt V3.1) for ${country.name_es}...`);
        const rawCandidates = await researchCountry(country);

        // Strict Verification
        let pearls = rawCandidates.filter(p => p.evidence_count >= 2 && p.verified);

        // Global Dedupe by Fingerprint (More robust than Title)
        const uniquePearls: typeof pearls = [];
        pearls.forEach(p => {
            const fp = generateFingerprint(p);
            if (!existingFingerprints.has(fp)) {
                uniquePearls.push(p);
                existingFingerprints.add(fp);
            }
        });

        uniquePearls.sort((a, b) => b.overall_score - a.overall_score);
        const topPearls = uniquePearls.slice(0, 6); // Max 6 stored in Raw DB

        console.log(`[Run] Result: Raw=${rawCandidates.length}, Verified=${pearls.length}, AfterDedupe=${uniquePearls.length}. Writing Top ${topPearls.length}.`);

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
            runId, runDate, country.name_es, country.region, 'deep-search-v3.1',
            topPearls.length, rawCandidates.length, `Verified: ${pearls.length}`,
            runFolderId, sheetId, runDate
        ]]);

        // 2. Raw DB (Ideas)
        if (topPearls.length > 0) {
            const ideaRows = topPearls.map((p, idx) => [
                runId, runDate, country.name_es, idx + 1, 'Pearl', 'B2C',
                p.name, 'Unknown', p.faceless_format, p.why_viral, p.description,
                p.monetization, 'Medium', 'DeepSearch', p.source_url,
                'Verified', runDate,
                // Run 2 Cols
                p.b2_model, p.faceless_score, 0, p.selling_friction, p.cost_score,
                p.miami_fit, p.overall_score, p.is_top_pick, generateFingerprint(p),
                p.evidence_count, p.evidence_summary,
                // Run 2.4 Rich Cols: JSON stringify arrays/objects
                JSON.stringify(p.execution_steps),
                JSON.stringify(p.faceless_script),
                JSON.stringify(p.monetization_options),
                p.friction_notes,
                p.cost_notes
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

            // 3. Populate LIBRARY_VIEW (High Quality Filter)
            // Filter: Verified + Sufficient Score (>=75 just to be safe, but "Top Pick" logic is usually 80)
            const libraryRows: any[][] = [];
            topPearls.forEach(p => {
                if (p.is_top_pick || p.overall_score >= 80) {
                    libraryRows.push([
                        p.overall_score,
                        country.name_es,
                        p.name,
                        p.why_viral,
                        p.description, // using summary as why_pearl proxy? No, description is summary. why_viral is why pearl.
                        p.evidence_count,
                        p.sources.join(', '),
                        '', // chat_md empty initially
                        '', // miami_adapt empty initially
                        runDate,
                        runId
                    ]);
                }
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
