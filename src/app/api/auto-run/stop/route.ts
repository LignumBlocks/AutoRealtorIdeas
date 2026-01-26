import { NextResponse } from 'next/server';
import { getRunnerState, saveRunnerState } from '@/lib/run-engine/state';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const state = await getRunnerState();
        state.status = 'PAUSED';
        await saveRunnerState(state);

        return NextResponse.json({ ok: true, status: 'PAUSED' });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
