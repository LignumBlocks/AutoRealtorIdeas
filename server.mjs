import express from "express";
import { google } from "googleapis";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT || process.env.REI_PORT || 8094);
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());

// Log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// --- UTILS ---

function requireAccess(req) {
    const expected = (process.env.REI_ACCESS_CODE || "").trim();
    if (!expected) return true;
    const got = String(req.headers["x-rei-access-code"] || req.headers["X-REI-ACCESS-CODE"] || "").trim();
    return got && got === expected;
}

// --- GOOGLE AUTH ---

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
];

function getAuth() {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyPath || !fs.existsSync(keyPath)) {
        throw new Error(`Service account key not found at: ${keyPath}`);
    }
    const raw = fs.readFileSync(keyPath, "utf8");
    const key = JSON.parse(raw);
    return new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES,
    });
}

function getDriveClient() {
    return google.drive({ version: "v3", auth: getAuth() });
}

function getSheetsClient() {
    return google.sheets({ version: "v4", auth: getAuth() });
}

// --- DRIVE LOGIC ---

const DRIVE_ROOT_FOLDER_NAME = "Auto_Realtor_Ideas";
const SUBFOLDERS = ["01_Config", "02_Runs", "03_Artifacts", "04_Sources"];

async function createOrLocateRootFolder() {
    const drive = getDriveClient();
    const adminEmail = process.env.ADMIN_EMAIL;

    const q = `name = '${DRIVE_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({ q, spaces: "drive" });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const createRes = await drive.files.create({
        requestBody: {
            name: DRIVE_ROOT_FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });

    const folderId = createRes.data.id;

    if (adminEmail) {
        try {
            await drive.permissions.create({
                fileId: folderId,
                requestBody: { role: "writer", type: "user", emailAddress: adminEmail },
            });
        } catch (e) {
            console.error("Error sharing folder:", e.message);
        }
    }

    return folderId;
}

async function ensureSubfolders(rootFolderId) {
    const drive = getDriveClient();
    const ids = {};
    for (const name of SUBFOLDERS) {
        const q = `name = '${name}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const res = await drive.files.list({ q, spaces: "drive" });
        if (res.data.files && res.data.files.length > 0) {
            ids[name] = res.data.files[0].id;
        } else {
            const createRes = await drive.files.create({
                requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [rootFolderId] },
                fields: "id",
            });
            ids[name] = createRes.data.id;
        }
    }
    return ids;
}

// --- SHEETS LOGIC ---

const SHEET_NAME = "Auto_Realtor_Ideas_Log";
const RUNS_HEADERS = ["run_id", "run_date", "country", "region", "run_type", "verified_count", "synthesized_included", "notes", "drive_folder_id", "sheet_id", "created_at"];

async function createOrLocateSheet(parentFolderId) {
    const drive = getDriveClient();
    const q = `name = '${SHEET_NAME}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const res = await drive.files.list({ q, spaces: "drive" });
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }
    const createRes = await drive.files.create({
        requestBody: { name: SHEET_NAME, mimeType: "application/vnd.google-apps.spreadsheet", parents: [parentFolderId] },
        fields: "id",
    });
    return createRes.data.id;
}

async function ensureTabsAndHeaders(spreadsheetId) {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map((s) => s.properties?.title) || [];

    if (!existingTitles.includes("Runs")) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: [{ addSheet: { properties: { title: "Runs" } } }] },
        });
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "Runs!A1",
            valueInputOption: "RAW",
            requestBody: { values: [RUNS_HEADERS] },
        });
    }
}

// --- CORE ENGINE ---

async function tavilySearch(query, opts = {}) {
    const key = (process.env.TAVILY_API_KEY || "").trim();
    if (!key) return { ok: false, error: "TAVILY_KEY_MISSING" };
    const payload = { api_key: key, query, search_depth: opts.search_depth || "advanced", include_answer: true, max_results: opts.max_results || 8 };
    const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data.detail || data.error || `TAVILY_HTTP_${r.status}`, status: r.status };
    const context = (data.results || []).map(r => `[FUENTE: ${r.title || "Sin título"}]\nURL: ${r.url || ""}\nCONTENIDO: ${(r.content || "").slice(0, 1200)}`).join("\n\n---\n\n");
    return { ok: true, data, context };
}

async function geminiGenerate(messagesOrPrompt) {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    const model = (process.env.GEMINI_MODEL || "gemini-2.0-flash").replace(/^models\//, "");
    if (!key) return { ok: false, error: "GEMINI_KEY_MISSING" };
    let prompt = Array.isArray(messagesOrPrompt) ? messagesOrPrompt.map(m => `${m.role || "user"}: ${m.content || ""}`).join("\n") : String(messagesOrPrompt || "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }) });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data.error?.message || `GEMINI_HTTP_${r.status}`, status: r.status };
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";
    let ideas = [];
    try { const p = JSON.parse(text); if (Array.isArray(p?.ideas)) ideas = p.ideas; } catch { }
    return { ok: true, text, ideas };
}

async function engineRunTopic(topic) {
    const name = topic?.name || "Topic";
    const market = topic?.market || "Miami, FL";
    const baseQueries = [`market gaps and pain points in ${name} at ${market} ${new Date().getFullYear()}`];
    const tavRes = await tavilySearch(baseQueries[0]);
    const perlaPrompt = `REI Global Engine. Topic: ${name}. Market: ${market}. Context: ${tavRes.context?.slice(0, 20000)}. Return JSON: {"ideas":[{"title":"","snippet":"","summary":"","what_they_did":"","why_it_worked":"","how_to_replicate_md":"","budget_usd":0,"budget_status":"","soflo_status":""}]}`;
    const g = await geminiGenerate(perlaPrompt);
    return { ok: true, ideas: g.ideas || [], gemini_error: g.ok ? null : g.error };
}

// --- ENDPOINTS ---

app.get("/api/healthz", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/status", (req, res) => {
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || null;
    const hasSA = saPath ? fs.existsSync(saPath) : false;
    res.json({
        ok: true,
        env: {
            ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
            GOOGLE_APPLICATION_CREDENTIALS: saPath,
            GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
            TAVILY_API_KEY: !!process.env.TAVILY_API_KEY
        },
        drive: { serviceAccountFile: hasSA }
    });
});

app.get("/api/index", (req, res) => res.json({ ok: true, info: "REI API Index" }));
app.get("/api/package", (req, res) => res.json({ ok: true, version: "0.1.0" }));

app.all("/api/init", async (req, res) => {
    if (req.method === "GET") {
        return res.json({ ok: true, message: "Use POST to initialize Drive DB" });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const rootId = await createOrLocateRootFolder();
        await ensureSubfolders(rootId);
        const sheetId = await createOrLocateSheet(rootId);
        await ensureTabsAndHeaders(sheetId);
        res.json({ ok: true, folderId: rootId, sheetId });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.all("/api/test-append", async (req, res) => {
    if (req.method === "GET") {
        return res.json({ ok: true, message: "Use POST to test append" });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const rootId = await createOrLocateRootFolder();
        const sheetId = await createOrLocateSheet(rootId);
        const sheets = getSheetsClient();
        const runId = `run_${Date.now()}`;
        const row = [runId, new Date().toISOString(), "Test", "Test", "Test", 0, "", "Test run from API", rootId, sheetId, new Date().toISOString()];
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: "Runs!A1",
            valueInputOption: "RAW",
            requestBody: { values: [row] },
        });
        res.json({ ok: true, runId });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post("/api/tavily/search", async (req, res) => {
    if (!requireAccess(req)) return res.status(401).json({ error: "UNAUTHORIZED" });
    const out = await tavilySearch(req.body.query || req.body.q);
    res.json(out);
});

app.post("/api/gemini/chat", async (req, res) => {
    if (!requireAccess(req)) return res.status(401).json({ error: "UNAUTHORIZED" });
    const out = await geminiGenerate(req.body.messages || req.body.prompt || req.body.text);
    res.json(out);
});

app.post("/api/engine/runTopic", async (req, res) => {
    if (!requireAccess(req)) return res.status(401).json({ error: "UNAUTHORIZED" });
    const out = await engineRunTopic(req.body);
    res.json(out);
});

app.listen(PORT, HOST, () => {
    console.log(`rei-api (Express) listening on http://${HOST}:${PORT}`);
});
