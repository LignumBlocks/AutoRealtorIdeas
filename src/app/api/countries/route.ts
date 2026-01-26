import { NextResponse } from 'next/server';
import { searchCountries } from '@/lib/countries/index';

export const runtime = 'nodejs';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const results = searchCountries(q);
    return NextResponse.json(results);
}
