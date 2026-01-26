import { google } from 'googleapis';
import { getServiceAccountAuth } from './auth';

const SHEET_NAME = 'Auto_Realtor_Ideas_Log';

// Defined Headers (Keep for initialization, but rely on dynamic map for reading/writing specific info)
const RUNS_HEADERS = [
    'run_id', 'run_date', 'country', 'region', 'run_type',
    'verified_count', 'synthesized_included', 'notes',
    'drive_folder_id', 'sheet_id', 'created_at'
];

const IDEAS_HEADERS = [
    'run_id', 'run_date', 'country', 'rank', 'label', 'model',
    'name', 'who', 'video_format', 'why_viral', 'data_inputs',
    'monetization', 'miami_adapt', 'starter_titles', 'sources',
    'traction_evidence', 'created_at',
    // Run 2 Cols
    'b2_model', 'faceless_score', 'automation_score', 'selling_friction', 'cost_score',
    'miami_fit', 'overall_score', 'is_top_pick', 'dedupe_fingerprint',
    'evidence_count', 'evidence_summary',
    // Run 2.4 Rich Cols
    'execution_steps_json', 'script_json', 'monetization_json', 'friction_notes', 'cost_notes',
    // Run 3.0
    'chat_md',
    // Run 3.6.4 MVP
    'proof_pack_json', 'miami_saturation_json'
];

// Run 3.1: Library View (Human Friendly)
const LIBRARY_VIEW_HEADERS = [
    'overall_score', 'country', 'name', 'why_viral', 'why_pearl',
    'evidence_count', 'sources', 'chat_md', 'miami_adapt', 'run_date', 'run_id',
    'proof_pack_json', 'miami_saturation_json'
];

// Run 3.1: Stats
const COUNTRY_STATS_HEADERS = [
    'run_id', 'country', 'run_date', 'total_found', 'verified_count', 'top_pick_count', 'duration_s'
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

const COUNTRIES_HEADERS = [
    'country_code', 'iso3', 'name', 'region', 'tier',
    'priority_score', 'last_run_date', 'status', 'notes'
];

const IDEA_INDEX_HEADERS = [
    'fingerprint', 'idea_id', 'created_at', 'evidence_count'
];

export function getSheetsClient() {
    const auth = getServiceAccountAuth();
    return google.sheets({ version: 'v4', auth });
}

export async function createOrLocateSheet(parentFolderId: string): Promise<string> {
    const auth = getServiceAccountAuth();
    const drive = google.drive({ version: 'v3', auth });
    const sharedDriveId = process.env.DRIVE_SHARED_DRIVE_ID;

    const q = `name = '${SHEET_NAME}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
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
        return searchRes.data.files[0].id!;
    }

    const createRes = await drive.files.create({
        requestBody: {
            name: SHEET_NAME,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [parentFolderId],
        },
        fields: 'id',
        supportsAllDrives: true,
    });

    return createRes.data.id!;
}

export async function ensureTabsAndHeaders(spreadsheetId: string) {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map(s => s.properties?.title) || [];

    const requiredTabs = [
        { title: 'Runs', headers: RUNS_HEADERS },
        { title: 'Ideas', headers: IDEAS_HEADERS },
        { title: 'LIBRARY_VIEW', headers: LIBRARY_VIEW_HEADERS },
        { title: 'COUNTRY_STATS', headers: COUNTRY_STATS_HEADERS },
        { title: 'Sources', headers: SOURCES_HEADERS },
        { title: 'Patterns', headers: PATTERNS_HEADERS },
        { title: 'Countries', headers: COUNTRIES_HEADERS },
        { title: 'IdeaIndex', headers: IDEA_INDEX_HEADERS },
    ];

    const requests: any[] = [];
    for (const tab of requiredTabs) {
        if (!existingTitles.includes(tab.title)) {
            requests.push({
                addSheet: { properties: { title: tab.title } }
            });
        }
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    }

    for (const tab of requiredTabs) {
        const check = await sheets.spreadsheets.values.get({
            spreadsheetId, range: `${tab.title}!A1`
        });
        if (!check.data.values) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${tab.title}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: [tab.headers] }
            });
        }
    }
}

export async function appendRows(spreadsheetId: string, tabName: string, rows: any[][]) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows }
    });
}

// --- Dynamic Column Logic (Run 3.0) ---

export async function getHeaderMap(spreadsheetId: string, tabName: string): Promise<Record<string, number>> {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!1:1`
    });

    const headers = res.data.values?.[0] || [];
    const map: Record<string, number> = {};
    headers.forEach((h, i) => map[h] = i);
    return map;
}

export async function ensureColumn(spreadsheetId: string, tabName: string, headerName: string): Promise<number> {
    const map = await getHeaderMap(spreadsheetId, tabName);
    if (map[headerName] !== undefined) {
        return map[headerName];
    }

    // Append new column header (Row 1)
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[headerName]] }
    });

    const newMap = await getHeaderMap(spreadsheetId, tabName);
    return newMap[headerName];
}

export function columnIndexToLetter(index: number): string {
    let temp, letter = '';
    while (index >= 0) {
        temp = index % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        index = (index - temp - 1) / 26;
    }
    return letter;
}

export async function updateCell(spreadsheetId: string, tabName: string, row: number, colIndex: number, value: any) {
    const sheets = getSheetsClient();
    if (colIndex < 0 || colIndex === undefined) {
        throw new Error(`Invalid Column Index: ${colIndex}`);
    }
    const colLetter = columnIndexToLetter(colIndex);
    if (!colLetter) {
        throw new Error(`Could not determine Column Letter for Index: ${colIndex}`);
    }
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!${colLetter}${row}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[value]] }
    });
}



