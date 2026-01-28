import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const SERVICE_ACCOUNT_KEY_FILE =
    process.env.GOOGLE_SA_KEY_PATH || '.secrets/service-account.json';

export const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
];

function loadServiceAccountJson() {
    const keyPath = path.isAbsolute(SERVICE_ACCOUNT_KEY_FILE)
        ? SERVICE_ACCOUNT_KEY_FILE
        : path.resolve(process.cwd(), SERVICE_ACCOUNT_KEY_FILE);

    if (!fs.existsSync(keyPath)) {
        throw new Error(`Service account key not found at: ${keyPath}`);
    }

    const raw = fs.readFileSync(keyPath, 'utf8');
    const key = JSON.parse(raw);

    // Minimal sanity (do not log key contents)
    if (!key.client_email || !key.private_key) {
        throw new Error('Service account JSON missing client_email/private_key');
    }

    return { keyPath, key };
}

/**
 * Robust Service Account auth (explicit JWT).
 * Avoids edge/runtime inconsistencies with GoogleAuth in some Next setups.
 */
export function getServiceAccountAuth() {
    const { key } = loadServiceAccountJson();

    const auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES,
    });

    return auth;
}

export async function getServiceAccountEmail() {
    const { key } = loadServiceAccountJson();
    return key.client_email as string;
}
