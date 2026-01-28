import type { NextApiRequest, NextApiResponse } from 'next';
import { createOrLocateRootFolder, ensureSubfolders } from '../../lib/google/drive';
import { createOrLocateSheet, ensureTabsAndHeaders } from '../../lib/google/sheets';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Initializing Drive DB...');

        // 1. Create/Find Root Folder
        const rootFolderId = await createOrLocateRootFolder();

        // 2. Ensure Subfolders
        await ensureSubfolders(rootFolderId);

        // 3. Create/Find Master Sheet (in Root for visibility)
        const sheetId = await createOrLocateSheet(rootFolderId);

        // 4. Ensure Headers
        await ensureTabsAndHeaders(sheetId);

        console.log('Drive DB Initialized:', { rootFolderId, sheetId });

        res.status(200).json({
            ok: true,
            folderId: rootFolderId,
            sheetId: sheetId
        });
    } catch (error: any) {
        console.error('Init Error:', error);
        res.status(500).json({
            ok: false,
            error: error.message || 'Unknown error during initialization'
        });
    }
}
