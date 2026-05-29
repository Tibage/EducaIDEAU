import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import { JsonFallbackStore } from "./jsonFallbackStore.js";
import { validateIndication, normalizeIndication } from "./validation.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const tableName = process.env.SUPABASE_INDICACOES_TABLE || "indicacoes";
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const adminToken = process.env.ADMIN_TOKEN || "";
const localStore = new JsonFallbackStore("data/indicacoes.json");
const supabase = createSupabaseClient();
const rateLimitBucket = new Map();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(cors({ origin: resolveCorsOrigin() }));
app.use(morgan("dev"));
app.use("/assets", express.static("assets", { immutable: true, maxAge: "7d" }));
app.get("/", (_request, response) => response.sendFile("index.html", { root: process.cwd() }));
app.get("/index.html", (_request, response) => response.sendFile("index.html", { root: process.cwd() }));
app.get("/styles.css", (_request, response) => response.sendFile("styles.css", { root: process.cwd() }));
app.get("/script.js", (_request, response) => response.sendFile("script.js", { root: process.cwd() }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    storage: supabase ? "supabase" : "local-json",
    baseUrl: publicBaseUrl,
  });
});

app.post("/api/indicacoes", async (request, response, next) => {
  try {
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      return response.status(429).json({
        ok: false,
        error: "Muitas tentativas. Aguarde um pouco e tente novamente.",
      });
    }

    const validation = validateIndication(request.body);
    if (!validation.ok) {
      return response.status(422).json({
        ok: false,
        error: "Revise os campos da indicação.",
        fields: validation.errors,
      });
    }

    const indication = normalizeIndication(request.body, {
      id: crypto.randomUUID(),
      ipHash: hashIp(getClientIp(request)),
      userAgent: request.get("user-agent") || "",
    });

    const saved = await saveIndication(indication);

    response.status(201).json({
      ok: true,
      id: saved.id,
      status: saved.status,
      storage: supabase ? "supabase" : "local-json",
      message: "Indicação recebida com sucesso.",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/indicacoes", requireAdmin, async (request, response, next) => {
  try {
    const status = typeof request.query.status === "string" ? request.query.status : "";
    const rows = await listIndications(status);
    response.json({ ok: true, count: rows.length, rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/indicacoes.csv", requireAdmin, async (_request, response, next) => {
  try {
    const rows = await listIndications("");
    response.type("text/csv").send(toCsv(rows));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/indicacoes/:id/status", requireAdmin, async (request, response, next) => {
  try {
    const allowed = new Set(["recebida", "em_triagem", "finalista", "vencedora", "arquivada"]);
    const status = String(request.body?.status || "");

    if (!allowed.has(status)) {
      return response.status(422).json({ ok: false, error: "Status inválido." });
    }

    const updated = await updateIndicationStatus(request.params.id, status);
    response.json({ ok: true, row: updated });
  } catch (error) {
    next(error);
  }
});

app.use((request, response) => {
  if (request.path.startsWith("/api/")) {
    return response.status(404).json({ ok: false, error: "Rota não encontrada." });
  }
  response.status(404).sendFile("index.html", { root: process.cwd() });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    ok: false,
    error: "Não foi possível processar a solicitação agora.",
  });
});

app.listen(port, () => {
  console.log(`Prêmio IDEAU rodando em ${publicBaseUrl}`);
  console.log(`Persistência: ${supabase ? "Supabase" : "JSON local"}`);
});

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function resolveCorsOrigin() {
  const raw = process.env.CORS_ORIGIN || publicBaseUrl;
  if (raw.trim() === "*") return true;
  const allowed = raw.split(",").map((origin) => origin.trim()).filter(Boolean);

  return (origin, callback) => {
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Origem não permitida pelo CORS."));
  };
}

function requireAdmin(request, response, next) {
  const token = request.get("x-admin-token") || request.query.token;
  if (!adminToken || token !== adminToken) {
    return response.status(401).json({ ok: false, error: "Acesso administrativo negado." });
  }
  next();
}

function checkRateLimit(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 8;
  const bucket = rateLimitBucket.get(ip) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  rateLimitBucket.set(ip, recent);
  return { allowed: recent.length <= limit };
}

function getClientIp(request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(`${ip}:${process.env.ADMIN_TOKEN || "ideau"}`).digest("hex");
}

async function saveIndication(indication) {
  if (!supabase) return localStore.insert(indication);

  const { data, error } = await supabase.from(tableName).insert(indication).select().single();
  if (error) throw error;
  return data;
}

async function listIndications(status) {
  if (!supabase) return localStore.list(status);

  let query = supabase.from(tableName).select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function updateIndicationStatus(id, status) {
  if (!supabase) return localStore.updateStatus(id, status);

  const { data, error } = await supabase
    .from(tableName)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function toCsv(rows) {
  const headers = [
    "id",
    "created_at",
    "status",
    "nome_indicado",
    "categoria",
    "autor_nome",
    "autor_email",
    "autor_telefone",
    "instituicao",
    "cidade",
    "motivo",
  ];

  const lines = rows.map((row) => headers.map((header) => csvCell(row[header])).join(","));
  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
