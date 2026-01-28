import type { NextApiRequest, NextApiResponse } from 'next';
import { createOrLocateRootFolder } from '../../lib/google/drive';
import { createOrLocateSheet, appendRows } from '../../lib/google/sheets';
// Removed uuid import


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Testing Append...');

        // 1. Locate Resources (Stateless approach for robustness)
        const rootFolderId = await createOrLocateRootFolder();
        const sheetId = await createOrLocateSheet(rootFolderId);

        // 2. Prepare Test Data
        const runId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const testRow = [
            runId,              // run_id
            timestamp,          // run_date
            'Test Country',     // country
            'Test Region',      // region
            'TEST_APPEND',      // run_type
            '0',                // verified_count
            'FALSE',            // synthesized_included
            'Test append via API endpoint', // notes
            rootFolderId,       // drive_folder_id
            sheetId,            // sheet_id
            timestamp           // created_at
        ];

        // 3. Append to 'Runs' tab (default tab per sheets.ts)
        await appendRows(sheetId, 'Runs', [testRow]);

        console.log('Append Successful:', runId);

        res.status(200).json({
            ok: true,
            runId: runId
        });
    } catch (error: any) {
        console.error('Append Error:', error);
        res.status(500).json({
            ok: false,
            error: error.message || 'Unknown error during test append'
        });
    }
}
