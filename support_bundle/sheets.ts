import { google } from 'googleapis';
import { getServiceAccountAuth } from './auth';

const SHEET_NAME = 'Auto_Realtor_Ideas_Log';

// Defined Headers
const RUNS_HEADERS = [
    'run_id', 'run_date', 'country', 'region', 'run_type',
    'verified_count', 'synthesized_included', 'notes',
    'drive_folder_id', 'sheet_id', 'created_at'
];

const IDEAS_HEADERS = [
    'run_id', 'run_date', 'country', 'rank', 'label', 'model',
    'name', 'who', 'video_format', 'why_viral', 'data_inputs',
    'monetization', 'miami_adapt', 'starter_titles', 'sources',
    'traction_evidence', 'created_at'
];

const SOURCES_HEADERS = [
    'run_id', 'run_date', 'country', 'idea_rank',
    'source_url', 'source_type', 'note', 'created_at'
];

const PATTERNS_HEADERS = [
    'run_id', 'run_date', 'pattern_name', 'where_working',
    'why_it_works', 'miami_failure_modes', 'hypothesis_to_test',
    'sources', 'created_at'
];

export function getSheetsClient() {
    const auth = getServiceAccountAuth();
    return google.sheets({ version: 'v4', auth });
}

/**
 * Creates or locates the Master Sheet in the specified folder.
 */
export async function createOrLocateSheet(parentFolderId: string): Promise<string> {
    const auth = getServiceAccountAuth();
    // Using Drive API to find/create file, then Sheets API to edit
    const drive = google.drive({ version: 'v3', auth });

    const q = `name = '${SHEET_NAME}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const searchRes = await drive.files.list({ q });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        return searchRes.data.files[0].id!;
    }

    // Create new sheet
    const createRes = await drive.files.create({
        requestBody: {
            name: SHEET_NAME,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [parentFolderId],
        },
        fields: 'id',
    });

    return createRes.data.id!;
}

/**
 * Ensures required tabs exist and have headers.
 */
export async function ensureTabsAndHeaders(spreadsheetId: string) {
    const sheets = getSheetsClient();

    // Get current sheets
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map(s => s.properties?.title) || [];

    const requiredTabs = [
        { title: 'Runs', headers: RUNS_HEADERS },
        { title: 'Ideas', headers: IDEAS_HEADERS },
        { title: 'Sources', headers: SOURCES_HEADERS },
        { title: 'Patterns', headers: PATTERNS_HEADERS },
    ];

    const requests: any[] = [];

    // Create missing tabs
    for (const tab of requiredTabs) {
        if (!existingTitles.includes(tab.title)) {
            requests.push({
                addSheet: {
                    properties: { title: tab.title }
                }
            });
        }
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
        });
    }

    // Check and write headers
    // Re-fetch meta if we added sheets, or just blindly update headers (safer to just update)
    // We can just use updateCells to force headers at (0,0)

    for (const tab of requiredTabs) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tab.title}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [tab.headers]
            }
        });
    }
}

/**
 * Appends rows to a specific tab.
 */
export async function appendRows(spreadsheetId: string, tabName: string, rows: any[][]) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: rows
        }
    });
}
