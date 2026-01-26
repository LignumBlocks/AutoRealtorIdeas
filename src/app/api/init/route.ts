import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createOrLocateRootFolder, ensureSubfolders, writeSettingsJson, DriveInitResult } from '@/lib/google/drive';
import { createOrLocateSheet, ensureTabsAndHeaders } from '@/lib/google/sheets';
import { getServiceAccountEmail } from '@/lib/google/auth';

export async function POST() {
    try {
        const email = await getServiceAccountEmail();
        if (!email) {
            return NextResponse.json({ error: 'Service account not configured' }, { status: 500 });
        }

        // 1. Root Folder
        const rootFolderId = await createOrLocateRootFolder();

        // 2. Subfolders
        const subfolderIds = await ensureSubfolders(rootFolderId);

        // 3. Settings File
        const settingsId = await writeSettingsJson(subfolderIds['01_Config'], {
            initializedAt: new Date().toISOString(),
            initializedBy: email,
            version: '1.0.0'
        });

        // 4. Master Sheet
        const sheetId = await createOrLocateSheet(rootFolderId);
        await ensureTabsAndHeaders(sheetId);

        // 5. Update settings with sheet ID for reference
        await writeSettingsJson(subfolderIds['01_Config'], {
            initializedAt: new Date().toISOString(),
            initializedBy: email,
            version: '1.0.0',
            masterSheetId: sheetId
        });

        return NextResponse.json({
            ok: true,
            serviceAccountEmail: email,
            folderId: rootFolderId,
            sheetId: sheetId,
            subfolders: subfolderIds,
            sharedDriveId: process.env.DRIVE_SHARED_DRIVE_ID,
        });

    } catch (error: any) {
        console.error('Init failed:', error);
        return NextResponse.json({
            ok: false,
            error: error.message,
            errors: error.errors,
            response: error.response?.data
        }, { status: 500 });
    }
}
