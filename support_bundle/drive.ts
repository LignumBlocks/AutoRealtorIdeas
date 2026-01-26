import { google } from 'googleapis';
import { getServiceAccountAuth } from './auth';

const DRIVE_ROOT_FOLDER_NAME = 'Auto_Realtor_Ideas';
const SUBFOLDERS = ['01_Config', '02_Runs', '03_Artifacts', '04_Sources'];

export interface DriveInitResult {
    rootFolderId: string;
    subfolderIds: Record<string, string>;
    settingsFileId?: string;
}

/**
 * Returns an authenticated Drive client
 */
export function getDriveClient() {
    const auth = getServiceAccountAuth();
    return google.drive({ version: 'v3', auth });
}

/**
 * Creates or finds the root folder.
 * If DRIVE_ROOT_FOLDER_ID is set in env, acts as verification.
 * Otherwise searches for folder by name.
 * If not found, creates it and shares with GOOGLE_ADMIN_EMAIL.
 */
export async function createOrLocateRootFolder(): Promise<string> {
    const drive = getDriveClient();
    const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;

    // 1. Check if ID is explicitly provided
    if (process.env.DRIVE_ROOT_FOLDER_ID) {
        console.log('Using configured DRIVE_ROOT_FOLDER_ID:', process.env.DRIVE_ROOT_FOLDER_ID);
        // Verify access
        await drive.files.get({ fileId: process.env.DRIVE_ROOT_FOLDER_ID });
        return process.env.DRIVE_ROOT_FOLDER_ID;
    }

    // 2. Search for existing folder by name
    // Note: Service Account only sees files shared with it or created by it.
    const searchRes = await drive.files.list({
        q: `name = '${DRIVE_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and transaction = false`,
        spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        console.log('Found existing folder:', searchRes.data.files[0].id);
        return searchRes.data.files[0].id!;
    }

    // 3. Create new folder
    console.log('Creating new root folder...');
    const createRes = await drive.files.create({
        requestBody: {
            name: DRIVE_ROOT_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
    });

    const folderId = createRes.data.id!;
    console.log('Created root folder:', folderId);

    // 4. Share with Admin if email provided
    if (adminEmail) {
        console.log(`Sharing folder ${folderId} with ${adminEmail}...`);
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: adminEmail,
            },
            // Avoid sending email notification if desired, but true ensures they see it 'Shared with me'
            sendNotificationEmail: true,
        });
    } else {
        console.warn('GOOGLE_ADMIN_EMAIL not set. Folder created but NOT shared with user.');
    }

    return folderId;
}

/**
 * Ensures all standard subfolders exist within the root folder.
 */
export async function ensureSubfolders(rootFolderId: string): Promise<Record<string, string>> {
    const drive = getDriveClient();
    const folderIds: Record<string, string> = {};

    for (const name of SUBFOLDERS) {
        // Check if exists
        const q = `name = '${name}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const searchRes = await drive.files.list({ q });

        if (searchRes.data.files && searchRes.data.files.length > 0) {
            folderIds[name] = searchRes.data.files[0].id!;
        } else {
            // Create
            const createRes = await drive.files.create({
                requestBody: {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [rootFolderId],
                },
                fields: 'id',
            });
            folderIds[name] = createRes.data.id!;
        }
    }

    return folderIds;
}

/**
 * Writes or overwrites settings.json in 01_Config
 */
export async function writeSettingsJson(configFolderId: string, payload: any) {
    const drive = getDriveClient();
    const filename = 'settings.json';

    // Check if exists
    const q = `name = '${filename}' and '${configFolderId}' in parents and trashed = false`;
    const searchRes = await drive.files.list({ q });

    const fileMetadata = {
        name: filename,
        parents: [configFolderId],
    };

    const media = {
        mimeType: 'application/json',
        body: JSON.stringify(payload, null, 2),
    };

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        const fileId = searchRes.data.files[0].id!;
        await drive.files.update({
            fileId: fileId,
            requestBody: { name: filename }, // Refresh metadata if needed
            media: media,
        });
        return fileId;
    } else {
        const createRes = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });
        return createRes.data.id!;
    }
}
