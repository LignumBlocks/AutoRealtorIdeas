import { NextResponse } from 'next/server';
import { getRunnerState, saveRunnerState } from '@/lib/run-engine/state';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { reset } = body; // If true, starts from 0

        let state = await getRunnerState();

        if (reset) {
            state.cursor_index = 0;
            state.completed_codes = [];
            state.errors = [];
        }

        state.status = 'RUNNING';
        state.last_run_at = new Date().toISOString();

        await saveRunnerState(state);

        return NextResponse.json({ ok: true, state });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
