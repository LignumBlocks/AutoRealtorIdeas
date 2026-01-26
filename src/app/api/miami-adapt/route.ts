import { NextResponse } from 'next/server';
import { getSheetsClient, createOrLocateSheet } from '@/lib/google/sheets';
import { createOrLocateRootFolder } from '@/lib/google/drive';
import { GeminiProvider } from '@/lib/run-engine/providers/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fingerprint, title, summary, sources } = body;

        if (!fingerprint) return NextResponse.json({ ok: false, error: 'Missing fingerprint' }, { status: 400 });

        // 1. Locate Sheet
        const rootId = await createOrLocateRootFolder();
        const sheetId = await createOrLocateSheet(rootId);
        const sheets = getSheetsClient();

        // 2. Find Row by Fingerprint (Col Z / Index 25)
        // We fetch Z:Z. 
        const fingerprintRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Ideas!Z:Z',
        });

        const rows = fingerprintRes.data.values || [];
        // headers is row[0], data starts row[1] => Sheet Row 2
        const rowIndex = rows.findIndex(r => r[0] === fingerprint);

        if (rowIndex === -1) {
            return NextResponse.json({ ok: false, error: 'Idea not found in sheet' }, { status: 404 });
        }

        const sheetRowNumber = rowIndex + 1; // 1-based index

        // 3. Check Cache (Col M / Index 12)
        // We fetch M{Row}:M{Row}
        const cacheRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `Ideas!M${sheetRowNumber}`,
        });

        const cachedValue = cacheRes.data.values?.[0]?.[0] || '';

        // If it starts with "Medium" (placeholder) or is empty/short, we treat as uncached.
        // If it's valid markdown (>20 chars and not just "Medium"), use it.
        if (cachedValue && cachedValue.length > 20 && cachedValue !== 'Medium') {
            console.log(`[MiamiAdapt] Returning cached for Row ${sheetRowNumber}`);
            return NextResponse.json({ ok: true, adaptation: cachedValue, cached: true });
        }

        // 4. Generate with Gemini
        console.log(`[MiamiAdapt] Generating for Row ${sheetRowNumber}...`);
        const provider = new GeminiProvider();
        const adaptation = await provider.adaptToMiami(title, summary, sources || []);

        // 5. Save to Sheet
        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `Ideas!M${sheetRowNumber}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[adaptation]]
            }
        });

        return NextResponse.json({ ok: true, adaptation, cached: false });

    } catch (e: any) {
        console.error('Miami Adapt Error:', e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
