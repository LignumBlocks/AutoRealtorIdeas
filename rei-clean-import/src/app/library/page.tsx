import { getSheetsClient } from '@/lib/google/sheets';
import { getDriveClient } from '@/lib/google/drive';
import LibraryClient from './LibraryClient';

export const runtime = 'nodejs';

async function getIdeas() {
    try {
        const drive = getDriveClient();
        const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

        const q = `name = 'Auto_Realtor_Ideas_Log' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
        const listParams: any = { q };
        if (sharedDriveId) {
            listParams.driveId = sharedDriveId;
            listParams.corpora = 'drive';
            listParams.includeItemsFromAllDrives = true;
            listParams.supportsAllDrives = true;
        } else {
            listParams.spaces = 'drive';
        }

        const fileRes = await drive.files.list(listParams);
        if (!fileRes.data.files?.length) return [];
        const sheetId = fileRes.data.files[0].id!;

        const sheets = getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Ideas!A2:AZ1000',
        });

        const rows = res.data.values || [];

        return rows
            .filter(r => !r[0]?.startsWith('TEST_')) // Exclude Test Runs (r[0] = run_id)
            .map(r => ({
                country: r[2],
                type: r[4],
                title: r[6],
                summary: r[10],
                source_url: r[14],
                verified_status: r[15],

                faceless_score: Number(r[18] || 0),
                overall_score: Number(r[23] || 0),
                is_top_pick: r[24] === 'TRUE',
                fingerprint: r[25],
                evidence_count: Number(r[26] || 0),
                evidence_summary: r[27] || '',

                execution_steps_json: r[28],
                script_json: r[29],
                monetization_json: r[30],
                friction_notes: r[31],
                cost_notes: r[32],

                miami_adapt: (r[12] && r[12].length > 20) ? r[12] : null,
                why_pearl: r[9],
                sources: r[14] ? [r[14]] : []
            }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export default async function LibraryPage() {
    const ideas = await getIdeas();
    return <LibraryClient initialIdeas={ideas} />;
}
