import http from "http";
import { URL } from "url";

const PORT = Number(process.env.PORT || process.env.REI_PORT || 8094);
const HOST = process.env.HOST || "127.0.0.1";

function json(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function text(res, status, body) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function stripApiPrefix(pathname) {
  // Soporta ambos modos:
  // - Caddy proxy sin strip: /api/healthz llega como /api/healthz
  // - Caddy handle_path: /api/* llega como /healthz
  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}

function getAccessCodeHeader(req) {
  return req.headers["x-rei-access-code"] || req.headers["X-REI-ACCESS-CODE"];
}

function requireAccess(req) {
  const expected = (process.env.REI_ACCESS_CODE || "").trim();
  if (!expected) return true; // si no está seteado, no bloqueamos (evita lockout)
  const got = String(getAccessCodeHeader(req) || "").trim();
  return got && got === expected;
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error("BAD_JSON_BODY")); }
    });
    req.on("error", reject);
  });
}

function buildTavilyContext(data) {
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((r) => `[FUENTE: ${r.title || "Sin título"}]\nURL: ${r.url || ""}\nCONTENIDO: ${(r.content || "").slice(0, 1200)}`)
    .join("\n\n---\n\n");
}

async function tavilySearch(query, opts = {}) {
  const key = (process.env.TAVILY_API_KEY || "").trim();
  if (!key) return { ok: false, error: "TAVILY_KEY_MISSING" };

  const payload = {
    api_key: key,
    query,
    search_depth: opts.search_depth || "advanced",
    include_answer: true,
    max_results: Number(opts.max_results || 8),
  };

  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await r.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

  if (!r.ok) {
    const detail = data?.detail || data?.error || `TAVILY_HTTP_${r.status}`;
    return { ok: false, error: detail, status: r.status, data };
  }

  return {
    ok: true,
    status: r.status,
    data,
    answer: data?.answer || "",
    context: buildTavilyContext(data),
    resultsCount: Array.isArray(data?.results) ? data.results.length : 0,
  };
}

async function geminiGenerate(messagesOrPrompt, mode = "chat") {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  const model = (process.env.GEMINI_MODEL || "gemini-2.0-flash").replace(/^models\//, "");
  if (!key) return { ok: false, error: "GEMINI_KEY_MISSING" };

  // Normalizamos a texto (simple y robusto)
  let prompt = "";
  if (Array.isArray(messagesOrPrompt)) {
    prompt = messagesOrPrompt.map(m => `${m.role || "user"}: ${m.content || ""}`).join("\n");
  } else {
    prompt = String(messagesOrPrompt || "");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const txt = await r.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

  if (!r.ok) {
    const msg = data?.error?.message || `GEMINI_HTTP_${r.status}`;
    return { ok: false, error: msg, status: r.status, data };
  }

  const textOut =
    data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";

  // Intento: si el modelo devolvió JSON, lo parseo para ideas (sin romper el chat normal)
  let parsed = null, ideas = [];
  try {
    parsed = JSON.parse(textOut);
    if (Array.isArray(parsed?.ideas)) ideas = parsed.ideas;
  } catch {}

  return { ok: true, status: r.status, text: textOut, parsed, ideas };
}

async function engineRunTopic(topic) {
  const name = topic?.name || "Topic";
  const market = topic?.market || "Miami, FL";
  const goal = topic?.goal || "captar sellers (listings)";

  const searchCount = Math.max(1, Math.min(10, Number(topic?.searchCount || 4)));
  const baseQueries = [
    `biggest market gaps and pain points in ${name} at ${market} updated ${new Date().getFullYear()}`,
    `inefficient business models in ${name} ${market}`,
    `underserved niches in ${name} currently`,
    `new startup opportunities and arbitrage in ${name} ${market}`,
    `what customers hate about ${name} in ${market} right now`,
  ].slice(0, searchCount);

  const tav = [];
  for (const q of baseQueries) {
    tav.push({ q, ...(await tavilySearch(q, { max_results: 8, search_depth:"basic" })) });
  }

  const joinedContext = tav
    .filter(x => x.ok)
    .map(x => `QUERY: ${x.q}\n${x.context}`)
    .join("\n\n========================\n\n");

  const perlaPrompt = `
Eres REI Global Perlas Engine.
Objetivo: generar ideas NO obvias adaptadas a Miami, foco listings.
Devuelve SOLO JSON válido con el formato:
{"ideas":[{"title":"","snippet":"","summary":"","what_they_did":"","why_it_worked":"","how_to_replicate_md":"","budget_usd":0,"budget_status":"Low (< $1k)","soflo_status":"NOT_PRESENT","model_score":0}]}

Tema: ${name}
Mercado: ${market}
Meta: ${goal}

Contexto (fuentes):
${joinedContext.slice(0, 25000)}
`.trim();

  const g = await geminiGenerate(perlaPrompt, "json");
  return {
    ok: true,
    topic: { name, market, goal, searchCount },
    queries: baseQueries,
    tavily: tav.map(x => ({ q: x.q, ok: x.ok, status: x.status || null, resultsCount: x.resultsCount || 0, error: x.error || null })),
    ideas: g.ideas || [],
    gemini_ok: g.ok,
    gemini_error: g.ok ? null : g.error,
    gemini_text_preview: (g.text || "").slice(0, 400),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const p = stripApiPrefix(u.pathname);

    // healthz (GET/HEAD)
    if ((p === "/healthz" || p === "/") && (req.method === "GET" || req.method === "HEAD")) {
      if (req.method === "HEAD") { res.writeHead(200, { "cache-control": "no-store" }); return res.end(); }
      return json(res, 200, { ok: true, time: new Date().toISOString() });
    }

    // Proteger endpoints que gastan crédito
    const isPaid = (p.startsWith("/tavily/") || p.startsWith("/gemini/") || p.startsWith("/engine/"));
    if (isPaid && !requireAccess(req)) return json(res, 401, { ok: false, error: "UNAUTHORIZED" });

    if (p === "/tavily/search" && req.method === "POST") {
      const body = await readJson(req);
      const q = body.query || body.q || "";
      if (!q) return json(res, 400, { ok: false, error: "MISSING_QUERY" });
      const out = await tavilySearch(String(q), body);
      return json(res, out.ok ? 200 : 502, out);
    }

    if (p === "/gemini/chat" && req.method === "POST") {
      const body = await readJson(req);
      const msgs = Array.isArray(body.messages) ? body.messages : null;
      const prompt = body.prompt || body.text || "";
      const out = await geminiGenerate(msgs || prompt || "");
      // DEVOLVEMOS SIEMPRE text + ideas (si pudimos parsear JSON)
      if (!out.ok) return json(res, 502, out);
      return json(res, 200, { ok: true, text: out.text, ideas: out.ideas || [], parsed: out.parsed || null });
    }

    if (p === "/engine/runTopic" && req.method === "POST") {
      const body = await readJson(req);
      const out = await engineRunTopic(body);
      return json(res, 200, out);
    }

    // status (GET/HEAD)
    if ((u.pathname === "/api/status" || u.pathname === "/status") && (req.method === "GET" || req.method === "HEAD")) {
      const env = process.env;
      const fs = await import("fs");
      const saPath = env.GOOGLE_APPLICATION_CREDENTIALS || null;
      const hasSA = saPath ? fs.existsSync(saPath) : false;
      return json(res, 200, {
        ok: true,
        time: new Date().toISOString(),
        env: {
          ADMIN_EMAIL: !!env.ADMIN_EMAIL,
          GOOGLE_APPLICATION_CREDENTIALS: saPath,
          GOOGLE_API_KEY: !!env.GOOGLE_API_KEY,
          GEMINI_API_KEY: !!env.GEMINI_API_KEY,
          GEMINI_MODEL: env.GEMINI_MODEL || null,
          TAVILY_API_KEY: !!env.TAVILY_API_KEY
        },
        drive: { serviceAccountFile: hasSA }
      });
    }

    return json(res, 404, { ok: false, error: "NOT_FOUND", path: u.pathname });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`rei-api listening on http://${HOST}:${PORT}`);
});
