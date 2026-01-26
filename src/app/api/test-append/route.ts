import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { getDriveClient } from '@/lib/google/drive';
import { appendRows } from '@/lib/google/sheets';

// Helper to find IDs (in real app we'd read settings.json or DB)
async function findDbInfo() {
    const drive = getDriveClient();
    const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

    // Find root folder
    let rootId = process.env.DRIVE_ROOT_FOLDER_ID;
    if (!rootId) {
        const q = `name = 'Auto_Realtor_Ideas' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

        const listParams: any = { q };
        if (sharedDriveId) {
            listParams.driveId = sharedDriveId;
            listParams.corpora = 'drive';
            listParams.includeItemsFromAllDrives = true;
            listParams.supportsAllDrives = true;
            // Optionally constrain to search inside root of shared drive if needed, 
            // but unique name search within drive is usually fine.
            listParams.q = `${q} and '${sharedDriveId}' in parents`;
        } else {
            listParams.spaces = 'drive';
        }

        const res = await drive.files.list(listParams);
        if (res.data.files?.[0]) rootId = res.data.files[0].id!;
    }
    if (!rootId) throw new Error("Root folder not found");

    // Helper for sub-queries
    const findFile = async (q: string) => {
        const params: any = { q };
        if (sharedDriveId) {
            params.driveId = sharedDriveId;
            params.corpora = 'drive';
            params.includeItemsFromAllDrives = true;
            params.supportsAllDrives = true;
        } else {
            params.spaces = 'drive';
        }
        const res = await drive.files.list(params);
        return res.data.files?.[0]?.id;
    };

    // Find sheet
    const qSheet = `name = 'Auto_Realtor_Ideas_Log' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet'`;
    const sheetId = await findFile(qSheet);
    if (!sheetId) throw new Error("Master sheet not found");

    // Find Runs folder
    const qRuns = `name = '02_Runs' and '${rootId}' in parents`;
    const runsFolderId = await findFile(qRuns);

    return { rootId, sheetId, runsFolderId };
}

export async function POST() {
    try {
        const { rootId, sheetId, runsFolderId } = await findDbInfo();

        const timestamp = new Date().toISOString();
        const runId = `TEST_${Date.now()}`;

        // 1. Append to Sheets
        const runRow = [
            runId, timestamp, 'US', 'TestRegion', 'TEST',
            '1', 'true', 'Test run via API',
            runsFolderId, sheetId, timestamp
        ];
        await appendRows(sheetId, 'Runs', [runRow]);

        const ideaRow = [
            runId, timestamp, 'US', '1', 'Test Idea', 'ModelA',
            'Viral Video Concept', 'Agents', 'Short', 'Funny', 'Zillow Data',
            'Ads', 'Yes', 'Title A', 'http://source', 'High', timestamp
        ];
        await appendRows(sheetId, 'Ideas', [ideaRow]);

        // 2. Write Run JSON
        if (runsFolderId) {
            const drive = getDriveClient();
            await drive.files.create({
                requestBody: {
                    name: `${new Date().toISOString().split('T')[0]}_TEST_run.json`,
                    parents: [runsFolderId],
                },
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify({ runId, timestamp, status: 'success' }, null, 2)
                },
                supportsAllDrives: true,
            });
        }

        return NextResponse.json({ ok: true, runId, sheetId, runsFolderId });

    } catch (error: any) {
        console.error('Test append failed:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
