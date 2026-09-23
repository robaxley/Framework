import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractProject, ExtractionError } from "./lib/extract.js";
import { fetchOEmbed } from "./lib/oembed.js";
import { fetchYoutubeDescription } from "./lib/youtubeFetch.js";
import { requireAuth } from "./lib/auth.js";
import { checkAndIncrementDailyUsage, DAILY_LIMIT } from "./lib/usage.js";
import { sendWelcomeEmail } from "./lib/email.js";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";
import * as store from "./lib/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// The mobile app (and its web-preview target) calls this API from a
// different origin - native clients aren't subject to CORS at all, but
// any browser-based client needs these headers. Auth is still enforced
// by requireAuth below; this just controls which origins may read the
// response in a browser.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Public - needed to bootstrap the frontend's own Supabase client before login.
// SUPABASE_PUBLISHABLE_KEY is safe to expose (RLS-gated, mirrors the old anon key).
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  });
});

app.use("/api", requireAuth);

app.get("/api/oembed", async (req, res) => {
  const url = req.query.url;
  const [meta, description] = await Promise.all([fetchOEmbed(url), fetchYoutubeDescription(url)]);
  res.json({ ...meta, description });
});

// Best-effort welcome email, unrelated to Supabase's own (disabled) email
// confirmation - the mobile app calls this once, right after a successful
// signup. Looks up the address server-side from the verified token rather
// than trusting a client-supplied email.
app.post("/api/welcome-email", async (req, res) => {
  const { data } = await supabaseAdmin.auth.admin.getUserById(req.userId);
  if (data?.user?.email) sendWelcomeEmail(data.user.email);
  res.status(204).end();
});

const STATUS_BY_CODE = {
  empty_input: 400,
  auth: 500,
  rate_limited: 429,
  truncated: 422,
  refused: 422,
  no_tool_call: 502,
  api_error: 502,
};

app.post("/api/extract", async (req, res) => {
  const withinLimit = await checkAndIncrementDailyUsage(req.userId);
  if (!withinLimit) {
    return res.status(429).json({
      error: "daily_limit_reached",
      message: `You've hit today's limit of ${DAILY_LIMIT} imports - try again tomorrow.`,
    });
  }

  const { sourceUrl, title, rawText } = req.body ?? {};
  try {
    const draft = await extractProject({ sourceUrl, title, rawText });
    res.json({ draft });
  } catch (err) {
    if (err instanceof ExtractionError) {
      return res.status(STATUS_BY_CODE[err.code] ?? 502).json({ error: err.code, message: err.message });
    }
    throw err;
  }
});

app.get("/api/projects", async (req, res) => {
  res.json(await store.getAll(req.userId, req.query));
});

app.get("/api/projects/:id", async (req, res) => {
  const project = await store.getById(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: "not_found" });
  res.json(project);
});

app.post("/api/projects", async (req, res) => {
  res.status(201).json(await store.create(req.userId, req.body ?? {}));
});

app.put("/api/projects/:id", async (req, res) => {
  const project = await store.update(req.userId, req.params.id, req.body ?? {});
  if (!project) return res.status(404).json({ error: "not_found" });
  res.json(project);
});

app.patch("/api/projects/:id/steps/:index", async (req, res) => {
  const project = await store.toggleStep(req.userId, req.params.id, Number(req.params.index), req.body?.done);
  if (!project) return res.status(404).json({ error: "not_found" });
  res.json(project);
});

app.patch("/api/projects/:id/materials/:index", async (req, res) => {
  const project = await store.toggleMaterial(req.userId, req.params.id, Number(req.params.index), req.body?.owned);
  if (!project) return res.status(404).json({ error: "not_found" });
  res.json(project);
});

app.delete("/api/projects/:id", async (req, res) => {
  if (!(await store.remove(req.userId, req.params.id))) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error", message: err.message });
});

app.listen(PORT, () => console.log(`Framework running at http://localhost:${PORT}`));
