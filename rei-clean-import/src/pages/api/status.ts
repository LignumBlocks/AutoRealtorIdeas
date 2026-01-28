import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({
        ok: true,
        env: {
            ADMIN_EMAIL: true,
            GOOGLE_APPLICATION_CREDENTIALS: "mock-path",
            GOOGLE_API_KEY: true,
            GEMINI_API_KEY: true,
            TAVILY_API_KEY: true
        },
        drive: {
            serviceAccountFile: true
        }
    });
}
