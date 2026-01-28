import { getDriveClient } from './drive';

const SHARED_DRIVE_ID = process.env.DRIVE_SHARED_DRIVE_ID;

interface DriveFileOperationOptions {
    fileName: string;
    folderId: string;
}

/**
 * Generic helper to write a JSON file to a specific Drive folder.
 * Supports Shared Drives.
 */
export async function writeJsonToDrive(folderId: string, fileName: string, payload: any): Promise<string> {
    const drive = getDriveClient();

    // Check if file exists
    const q = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;

    const listParams: any = { q };
    if (SHARED_DRIVE_ID) {
        listParams.driveId = SHARED_DRIVE_ID;
        listParams.corpora = 'drive';
        listParams.includeItemsFromAllDrives = true;
        listParams.supportsAllDrives = true;
    } else {
        listParams.spaces = 'drive';
    }

    const searchRes = await drive.files.list(listParams);

    const media = {
        mimeType: 'application/json',
        body: JSON.stringify(payload, null, 2),
    };

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        // Update existing
        const fileId = searchRes.data.files[0].id!;
        await drive.files.update({
            fileId: fileId,
            requestBody: { name: fileName },
            media: media,
            supportsAllDrives: !!SHARED_DRIVE_ID,
        });
        return fileId;
    } else {
        // Create new
        const createRes = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media: media,
            fields: 'id',
            supportsAllDrives: !!SHARED_DRIVE_ID,
        });
        return createRes.data.id!;
    }
}

/**
 * Generic helper to read a JSON file from a specific Drive folder.
 * Returns null if not found.
 */
export async function readJsonFromDrive<T>(folderId: string, fileName: string): Promise<T | null> {
    const drive = getDriveClient();

    const q = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;

    const listParams: any = { q };
    if (SHARED_DRIVE_ID) {
        listParams.driveId = SHARED_DRIVE_ID;
        listParams.corpora = 'drive';
        listParams.includeItemsFromAllDrives = true;
        listParams.supportsAllDrives = true;
    } else {
        listParams.spaces = 'drive';
    }

    const searchRes = await drive.files.list(listParams);

    if (!searchRes.data.files || searchRes.data.files.length === 0) {
        return null;
    }

    const fileId = searchRes.data.files[0].id!;

    // Download file content
    const response = await drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: !!SHARED_DRIVE_ID,
    }, { responseType: 'json' });

    return response.data as T;
}

// Typed configuration managers

export async function saveCountriesConfig(configFolderId: string, countries: any[]) {
    return writeJsonToDrive(configFolderId, 'countries.json', countries);
}

export async function getCountriesConfig(configFolderId: string) {
    return readJsonFromDrive<any[]>(configFolderId, 'countries.json');
}

export async function saveSettingsConfig(configFolderId: string, settings: any) {
    return writeJsonToDrive(configFolderId, 'settings.json', settings);
}

export async function getSettingsConfig(configFolderId: string) {
    return readJsonFromDrive<any>(configFolderId, 'settings.json');
}

export async function saveCursorConfig(configFolderId: string, cursor: any) {
    return writeJsonToDrive(configFolderId, 'cursor.json', cursor);
}

export async function getCursorConfig(configFolderId: string) {
    return readJsonFromDrive<any>(configFolderId, 'cursor.json');
}
