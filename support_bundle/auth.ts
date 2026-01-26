import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Environment variables
const SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_SA_KEY_PATH || '.secrets/service-account.json';

export const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
];

/**
 * authenticates with Google using the service account key file.
 */
export function getServiceAccountAuth() {
    const keyPath = path.resolve(process.cwd(), SERVICE_ACCOUNT_KEY_FILE);

    if (!fs.existsSync(keyPath)) {
        throw new Error(`Service account key not found at: ${keyPath}`);
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: SCOPES,
    });

    return auth;
}

/**
 * Returns the email of the service account.
 */
export async function getServiceAccountEmail() {
    const auth = getServiceAccountAuth();
    const credentials = await auth.getCredentials();
    return credentials.client_email;
}
