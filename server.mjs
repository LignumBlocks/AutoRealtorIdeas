import express from "express";
import { google } from "googleapis";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT || process.env.REI_PORT || 8094);
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// --- UTILS ---

function requireAccess(req) {
  // 1. Check legacy Access Code
  const expectedAccess = (process.env.REI_ACCESS_CODE || "").trim();
  const gotAccess = String(req.headers["x-rei-access-code"] || req.headers["X-REI-ACCESS-CODE"] || "").trim();

  // 2. Check X-API-Key (new requirement)
  const expectedApiKey = (process.env.REI_API_KEY || "").trim();
  const gotApiKey = String(req.headers["x-api-key"] || req.headers["X-API-KEY"] || "").trim();

  // If REI_API_KEY is set, it MUST match
  if (expectedApiKey) {
    if (!gotApiKey || gotApiKey !== expectedApiKey) return false;
  }

  // Fallback to legacy REI_ACCESS_CODE if no API KEY set
  if (expectedAccess && !expectedApiKey) {
    return gotAccess && gotAccess === expectedAccess;
  }

  return true;
}

function extractAndParseJSON(text) {
  let cleanText = text.trim();
  try {
    // 1. Try direct parse
    return { ok: true, data: JSON.parse(cleanText) };
  } catch (e) {
    // 2. Try code fence extraction
    if (cleanText.includes('```')) {
      let parts = cleanText.split('```');
      for (let part of parts) {
        let candidate = part.trim();
        if (candidate.startsWith('json')) candidate = candidate.slice(4).trim();
        if (candidate.startsWith('{') || candidate.startsWith('[')) {
          try { return { ok: true, data: JSON.parse(candidate) }; } catch (e2) { }
        }
      }
    }
    // 3. Fallback to extracting from first { or [ to last } or ]
    const firstBrace = cleanText.search(/\{|\[/);
    const lastBrace = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        return { ok: true, data: JSON.parse(candidate) };
      } catch (e3) {
        return { ok: false, error: "GEMINI_PARSE_ERROR", parse_error: e3.message, preview: cleanText.slice(0, 400) };
      }
    }
    return { ok: false, error: "GEMINI_PARSE_ERROR", parse_error: "No JSON block found", preview: cleanText.slice(0, 400) };
  }
}

function sanitizeError(msg) {
  if (typeof msg !== "string") return msg;
  return msg
    .replace(/tvly-[a-zA-Z0-9-]+/g, "tvly-REDACTED")
    .replace(/AIza[a-zA-Z0-9_-]{35}/g, "GEMINI-REDACTED");
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
  console.log("createOrLocateRootFolder: starting...");
  const drive = getDriveClient();
  const adminEmail = process.env.ADMIN_EMAIL;

  const q = `name = '${DRIVE_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  console.log(`Searching for folder with query: ${q}`);
  const res = await drive.files.list({ q, spaces: "drive", fields: "files(id, name, owners)" });

  if (res.data.files && res.data.files.length > 0) {
    // Prefer the first one NOT owned by the SA (me: true)
    const folder = res.data.files.find(f => !f.owners?.[0]?.me) || res.data.files[0];
    console.log(`Found existing folder: ${folder.name} (${folder.id}) - Owner: ${folder.owners?.[0]?.emailAddress}`);
    return folder.id;
  }

  console.log("Root folder not found, creating...");
  const createRes = await drive.files.create({
    requestBody: {
      name: DRIVE_ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const folderId = createRes.data.id;
  console.log(`Created new root folder: ${folderId}`);

  if (adminEmail) {
    try {
      console.log(`Sharing folder ${folderId} with ${adminEmail}...`);
      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: "writer", type: "user", emailAddress: adminEmail },
      });
      console.log("Sharing successful.");
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
  const masterSheetId = process.env.DRIVE_MASTER_SHEET_ID;
  if (masterSheetId) {
    console.log(`Using configured DRIVE_MASTER_SHEET_ID: ${masterSheetId}`);
    return masterSheetId;
  }
  console.log(`createOrLocateSheet: parent=${parentFolderId}`);
  const drive = getDriveClient();
  const q = `name = '${SHEET_NAME}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const res = await drive.files.list({ q, spaces: "drive" });
  if (res.data.files && res.data.files.length > 0) {
    console.log(`Found existing sheet: ${res.data.files[0].id}`);
    return res.data.files[0].id;
  }
  console.log("Sheet not found, creating...");
  const createRes = await drive.files.create({
    requestBody: { name: SHEET_NAME, mimeType: "application/vnd.google-apps.spreadsheet", parents: [parentFolderId] },
    fields: "id",
  });
  console.log(`Created new sheet: ${createRes.data.id}`);
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

// --- CORE ENGINE (Legacy adapted) ---

async function tavilySearch(query, opts = {}) {
  const key = (process.env.TAVILY_API_KEY || "").trim();
  if (!key) return { ok: false, error: "TAVILY_KEY_MISSING" };
  const payload = { api_key: key, query, search_depth: opts.search_depth || "advanced", include_answer: true, max_results: opts.max_results || 8 };
  const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await r.json();
  if (!r.ok) {
    const rawError = data.detail || data.error || `TAVILY_HTTP_${r.status}`;
    return { ok: false, error: sanitizeError(String(rawError)), status: r.status };
  }
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
  if (!r.ok) {
    const rawError = data.error?.message || `GEMINI_HTTP_${r.status}`;
    return { ok: false, error: sanitizeError(String(rawError)), status: r.status };
  }
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";

  const parsed = extractAndParseJSON(text);
  let ideas = [];
  if (parsed.ok) {
    if (Array.isArray(parsed.data?.ideas)) ideas = parsed.data.ideas;
    else if (Array.isArray(parsed.data)) ideas = parsed.data;
  }

  return { ok: true, text, ideas, parse_error: parsed.ok ? null : parsed.error, parse_details: parsed };
}

async function engineRunTopic(topic) {
  const name = topic?.name || "Topic";
  const market = topic?.market || "Miami, FL";
  const baseQueries = [`market gaps and pain points in ${name} at ${market} ${new Date().getFullYear()}`];
  const tavRes = await tavilySearch(baseQueries[0]);
  const perlaPrompt = `REI Global Engine. Topic: ${name}. Market: ${market}. Context: ${tavRes.context?.slice(0, 20000)}. Return JSON: {"ideas":[{"title":"","snippet":"","summary":"","what_they_did":"","why_it_worked":"","how_to_replicate_md":"","budget_usd":0,"budget_status":"","soflo_status":""}]}`;
  const g = await geminiGenerate(perlaPrompt);
  return {
    ok: g.ok && !g.parse_error,
    ideas: g.ideas || [],
    ideasCount: (g.ideas || []).length,
    gemini_error: g.ok ? null : g.error,
    parse_error: g.parse_error,
    parse_details: g.parse_details
  };
}

// --- ENDPOINTS ---

app.get("/api/healthz", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/index", (req, res) => {
  try {
    const raw = fs.readFileSync("metadata.json", "utf8");
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ ok: false, error: "Failed to read metadata.json" });
  }
});

app.get("/api/package", (req, res) => {
  try {
    const raw = fs.readFileSync("package.json", "utf8");
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ ok: false, error: "Failed to read package.json" });
  }
});

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

// --- GOOGLE INTEGRATION ENDPOINTS ---

app.post("/api/init", async (req, res) => {
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

app.post("/api/test-append", async (req, res) => {
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
app.get('/api/auto-run/status', (req, res) => {
  res.json({
    ok: true,
    enabled: false,
    running: false,
    lastRun: null,
    nextRun: null,
    note: 'stub: auto-run not enabled on this server'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`rei-api (Express) listening on http://${HOST}:${PORT}`);
});

