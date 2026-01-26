import { getDriveClient, ensureSubfolders, createOrLocateRootFolder } from '../google/drive';

export interface AutoRunnerState {
    status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
    cursor_index: number; // Index in TOP100 array
    completed_codes: string[];
    errors: { code: string, error: string }[];
    last_run_at: string;
}

const STATE_FILE_NAME = 'auto_runner_state.json';
const DEFAULT_STATE: AutoRunnerState = {
    status: 'IDLE',
    cursor_index: 0,
    completed_codes: [],
    errors: [],
    last_run_at: ''
};

async function getConfigFolderId(): Promise<string> {
    const root = await createOrLocateRootFolder();
    const subs = await ensureSubfolders(root);
    return subs['01_Config'];
}

export async function getRunnerState(): Promise<AutoRunnerState> {
    try {
        const drive = getDriveClient();
        const configId = await getConfigFolderId();

        // Find file
        const q = `name = '${STATE_FILE_NAME}' and '${configId}' in parents and trashed = false`;
        const listParams: any = { q, spaces: 'drive' };
        if (process.env.DRIVE_SHARED_DRIVE_ID) {
            listParams.driveId = process.env.DRIVE_SHARED_DRIVE_ID;
            listParams.corpora = 'drive';
            listParams.includeItemsFromAllDrives = true;
            listParams.supportsAllDrives = true;
        }

        const res = await drive.files.list(listParams);
        if (res.data.files && res.data.files.length > 0) {
            const fileId = res.data.files[0].id!;
            const Content = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true });
            return Content.data as any; // Cast to state
        }
    } catch (e) {
        console.warn('Failed to load runner state, returning default', e);
    }
    return { ...DEFAULT_STATE };
}

export async function saveRunnerState(state: AutoRunnerState): Promise<void> {
    try {
        const drive = getDriveClient();
        const configId = await getConfigFolderId();

        // Check if exists logic reused or simplified (Delete/Create or Update)
        // For atomic safety, we might overwrite, but let's try update if exists
        const q = `name = '${STATE_FILE_NAME}' and '${configId}' in parents and trashed = false`;
        const listParams: any = { q, spaces: 'drive' };
        if (process.env.DRIVE_SHARED_DRIVE_ID) {
            listParams.driveId = process.env.DRIVE_SHARED_DRIVE_ID;
            listParams.corpora = 'drive';
            listParams.includeItemsFromAllDrives = true;
            listParams.supportsAllDrives = true;
        }

        const res = await drive.files.list(listParams);
        let fileId = '';

        const bodyContent = JSON.stringify(state, null, 2);

        if (res.data.files && res.data.files.length > 0) {
            fileId = res.data.files[0].id!;
            await drive.files.update({
                fileId,
                media: { mimeType: 'application/json', body: bodyContent },
                supportsAllDrives: true
            });
        } else {
            await drive.files.create({
                requestBody: { name: STATE_FILE_NAME, parents: [configId] },
                media: { mimeType: 'application/json', body: bodyContent },
                supportsAllDrives: true
            });
        }
    } catch (e) {
        console.error('Failed to save runner state', e);
    }
}
