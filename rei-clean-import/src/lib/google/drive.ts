import { google } from 'googleapis';
import { getServiceAccountAuth } from './auth';

const DRIVE_ROOT_FOLDER_NAME = 'Auto_Realtor_Ideas';
const SUBFOLDERS = ['01_Config', '02_Runs', '03_Artifacts', '04_Sources'];

export interface DriveInitResult {
    rootFolderId: string;
    subfolderIds: Record<string, string>;
    settingsFileId?: string;
    sharedDriveId?: string;
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
 * Supports Shared Drives if DRIVE_SHARED_DRIVE_ID is set.
 */
export async function createOrLocateRootFolder(): Promise<string> {
    const drive = getDriveClient();
    const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
    const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

    // 1. Check if ID is explicitly provided
    if (process.env.DRIVE_ROOT_FOLDER_ID) {
        console.log('Using configured DRIVE_ROOT_FOLDER_ID:', process.env.DRIVE_ROOT_FOLDER_ID);
        // Verify access - if in Shared Drive, might need supportsAllDrives
        await drive.files.get({
            fileId: process.env.DRIVE_ROOT_FOLDER_ID,
            supportsAllDrives: true
        });
        return process.env.DRIVE_ROOT_FOLDER_ID;
    }

    // 2. Search parameters
    const q = `name = '${DRIVE_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    let listParams: any = {
        q,
        // Default to 'drive' (user's drive) unless sharedDriveId is present
    };

    if (sharedDriveId) {
        console.log(`Searching in Shared Drive: ${sharedDriveId}`);
        listParams = {
            ...listParams,
            driveId: sharedDriveId,
            corpora: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            // Ensure we look inside the Shared Drive root if needed, 
            // but 'driveId' + 'corpora: drive' usually suffices for "in this drive".
            // To be safe, we can add parents check if we want *root* of shared drive, 
            // but searching by name in the whole drive is also fine for the unique root folder.
            q: `${q} and '${sharedDriveId}' in parents` // Force it to be at the top level of Shared Drive
        };
    } else {
        listParams.spaces = 'drive';
    }

    const searchRes = await drive.files.list(listParams);

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        console.log('Found existing folder:', searchRes.data.files[0].id);
        return searchRes.data.files[0].id!;
    }

    // 3. Create new folder
    console.log('Creating new root folder...');
    const createRequestBody: any = {
        name: DRIVE_ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
    };

    if (sharedDriveId) {
        createRequestBody.parents = [sharedDriveId];
    }

    const createRes = await drive.files.create({
        requestBody: createRequestBody,
        fields: 'id',
        supportsAllDrives: true,
    });

    const folderId = createRes.data.id!;
    console.log('Created root folder:', folderId);

    // 4. Permissions (Only needed if NOT in Shared Drive)
    if (!sharedDriveId && adminEmail) {
        console.log(`Sharing folder ${folderId} with ${adminEmail}...`);
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: adminEmail,
            },
            sendNotificationEmail: true,
        });
    }

    return folderId;
}

/**
 * Ensures all standard subfolders exist within the root folder.
 */
export async function ensureSubfolders(rootFolderId: string): Promise<Record<string, string>> {
    const drive = getDriveClient();
    const folderIds: Record<string, string> = {};
    const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

    for (const name of SUBFOLDERS) {
        // Check if exists
        const q = `name = '${name}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

        const listParams: any = { q };
        if (sharedDriveId) {
            listParams.driveId = sharedDriveId;
            listParams.corpora = 'drive';
            listParams.includeItemsFromAllDrives = true;
            listParams.supportsAllDrives = true;
        } else {
            listParams.spaces = 'drive';
        }

        const searchRes = await drive.files.list(listParams);

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
                supportsAllDrives: true,
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
    const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

    // Check if exists
    const q = `name = '${filename}' and '${configFolderId}' in parents and trashed = false`;

    const listParams: any = { q };
    if (sharedDriveId) {
        listParams.driveId = sharedDriveId;
        listParams.corpora = 'drive';
        listParams.includeItemsFromAllDrives = true;
        listParams.supportsAllDrives = true;
    } else {
        listParams.spaces = 'drive';
    }

    const searchRes = await drive.files.list(listParams);

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
            supportsAllDrives: true,
        });
        return fileId;
    } else {
        const createRes = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true,
        });
        return createRes.data.id!;
    }
}
