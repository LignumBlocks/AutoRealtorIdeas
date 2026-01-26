import { NextResponse } from 'next/server';
import { getSheetsClient, createOrLocateSheet, getHeaderMap, ensureColumn, updateCell } from '@/lib/google/sheets';
import { createOrLocateRootFolder } from '@/lib/google/drive';
import { GeminiProvider } from '@/lib/run-engine/providers/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fingerprint } = body;

        if (!fingerprint) return NextResponse.json({ ok: false, error: 'Missing fingerprint' }, { status: 400 });

        // 1. Locate Sheet
        const rootId = await createOrLocateRootFolder();
        const sheetId = await createOrLocateSheet(rootId);
        const sheets = getSheetsClient();

        // 2. Get Header Map & Fingerprint Column Index
        const headerMap = await getHeaderMap(sheetId, 'Ideas');
        let fingerprintCol = headerMap['dedupe_fingerprint'];
        if (fingerprintCol === undefined) {
            // Fallback: Try looking for 'fingerprint' or Column Z (25) if standard fail
            // But actually, if map fails, likely sheet is empty or malformed.
            // We can try to look at Z:Z.
            fingerprintCol = 25; // Default legacy
        }

        // 3. Find Row 
        // We need to fetch the fingerprint column data.
        // We don't know the letter. Convert index to letter.
        const getColLetter = (i: number) => {
            let temp, letter = '';
            while (i >= 0) {
                temp = i % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                i = (i - temp - 1) / 26;
            }
            return letter;
        };
        const fpLetter = getColLetter(fingerprintCol);

        const fpRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `Ideas!${fpLetter}:${fpLetter}`,
        });

        const rows = fpRes.data.values || [];
        const rowIndex = rows.findIndex(r => r[0] === fingerprint); // Row Index (0-based)

        if (rowIndex === -1) {
            return NextResponse.json({ ok: false, error: 'Idea not found' }, { status: 404 });
        }

        const sheetRowNumber = rowIndex + 1; // 1-based Row Number

        // 4. Check 'chat_md' Column
        let chatCol = headerMap['chat_md'];

        if (chatCol !== undefined) {
            // Read specific cell
            const chatLetter = getColLetter(chatCol);
            const cellRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `Ideas!${chatLetter}${sheetRowNumber}`,
            });
            const content = cellRes.data.values?.[0]?.[0];
            if (content && content.length > 50) {
                return NextResponse.json({ ok: true, chat_md: content, cached: true });
            }
        }

        // 5. Generate Content
        // We need context from the row. We should just fetch the whole row to be safe?
        // Or mapping? Map is better.
        // We need: title (name), summary (description), sources

        // Let's fetch the whole row to grab fields by index
        const fullRowRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `Ideas!${sheetRowNumber}:${sheetRowNumber}`,
        });
        const rowData = fullRowRes.data.values?.[0] || [];

        // Helper to get val
        const getVal = (name: string) => {
            const idx = headerMap[name];
            return idx !== undefined ? rowData[idx] : '';
        };

        const title = getVal('name') || getVal('Pearl Title (Es)') || '';
        const summary = getVal('description') || getVal('summary') || '';
        const sourcesRaw = getVal('sources') || ''; // 'url' or 'url, url'
        // Ideally we used 'sources' column which might be single URL in Sources Header but CSV here?
        // In Run 2.4 we map p.sources to sources col, but it might be just first url.
        // Let's rely on passed sources if needed? No, backend should be self-contained.
        // Let's use the sources column.

        const provider = new GeminiProvider();
        const chatMd = await provider.generateIdeaChat(title, summary, [sourcesRaw]);

        // 6. Save
        // Ensure column exists now
        if (chatCol === undefined) {
            try {
                // If header missing, try to create it, but handle race conditions or failure
                chatCol = await ensureColumn(sheetId, 'Ideas', 'chat_md');
            } catch (colErr) {
                console.warn('Could not ensure chat_md column:', colErr);
            }
        }

        if (sheetRowNumber > 0 && chatCol !== undefined) {
            try {
                await updateCell(sheetId, 'Ideas', sheetRowNumber, chatCol, chatMd);
            } catch (saveErr) {
                console.error('Failed to save chat to Sheets (Graceful Degrade):', saveErr);
                // Return success anyway, user just won't have it persisted
            }
        } else {
            console.warn(`Skipping Sheet Save: Row=${sheetRowNumber}, Col=${chatCol}`);
        }

        return NextResponse.json({ ok: true, chat_md: chatMd, cached: false });

    } catch (e: any) {
        console.error('Chat API Error:', e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
