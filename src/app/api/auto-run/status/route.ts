import { NextResponse } from 'next/server';
import { getRunnerState, saveRunnerState } from '@/lib/run-engine/state';
import { TOP100_COUNTRIES } from '@/lib/countries/top100';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const state = await getRunnerState();

        // Determine Next Country
        let nextCountry = null;
        let isFinished = false;

        if (state.cursor_index >= TOP100_COUNTRIES.length) {
            isFinished = true;
            if (state.status === 'RUNNING') {
                state.status = 'COMPLETED';
                await saveRunnerState(state); // Persist completion
            }
        } else {
            nextCountry = TOP100_COUNTRIES[state.cursor_index];
        }

        return NextResponse.json({
            ok: true,
            status: state.status,
            cursor: state.cursor_index,
            total: TOP100_COUNTRIES.length,
            nextCountry: nextCountry ? { code: nextCountry.code, name: nextCountry.name_es } : null,
            finished: isFinished
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

// Endpoint to advance cursor (User/Client calls this after a successful/failed run iteration)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { success, country_code } = body;

        const state = await getRunnerState();

        // Only advance if matches current (simple protection)
        // or just force advance
        state.cursor_index += 1;

        if (success) {
            if (country_code) state.completed_codes.push(country_code);
        } else {
            if (country_code) state.errors.push({ code: country_code, error: 'Run failed' });
        }

        state.last_run_at = new Date().toISOString();
        await saveRunnerState(state);

        return NextResponse.json({ ok: true, cursor: state.cursor_index });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
