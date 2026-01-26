import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    const hasServiceAccount = !!process.env.GOOGLE_SA_KEY_PATH;
    const hasAdminEmail = !!process.env.GOOGLE_ADMIN_EMAIL;
    const hasSerperKey = !!process.env.SERPER_API_KEY;
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    // Determine provider
    let liveSearchProvider = 'OFF';
    if (hasSerperKey) liveSearchProvider = 'SERPER';

    return NextResponse.json({
        ok: true,
        env: {
            hasServiceAccount,
            hasAdminEmail,
            hasSerperKey,
            hasGeminiKey,
            liveSearchProvider
        }
    });
}
