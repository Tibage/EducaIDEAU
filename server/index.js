import "dotenv/config";
import crypto from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { JsonFallbackStore } from "./jsonFallbackStore.js";
import { PostgresStore } from "./postgresStore.js";
import { SupabaseStore } from "./supabaseStore.js";
import { validateIndication, normalizeIndication } from "./validation.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const tableName = process.env.DATABASE_INDICACOES_TABLE || "indicacoes";
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const adminToken = process.env.ADMIN_TOKEN || "";
const localStore = new JsonFallbackStore("data/indicacoes.json");
const databaseStore = createDatabaseStore();
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
    storage: getStorageName(),
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
      storage: getStorageName(),
      message: "Inscrição recebida com sucesso.",
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

// Na Vercel o Express é executado pela função em api/[...path].js. Localmente,
// este arquivo continua iniciando o servidor normalmente.
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`Prêmio IDEAU rodando em ${publicBaseUrl}`);
    console.log(`Persistência: ${getStorageName()}`);
  });
}

function createDatabaseStore() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStore({
      url: supabaseUrl,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      tableName,
    });
  }

  if (!process.env.DATABASE_URL) return null;
  return new PostgresStore({
    connectionString: process.env.DATABASE_URL,
    tableName,
  });
}

function getStorageName() {
  if (!databaseStore) return "local-json";
  return databaseStore instanceof SupabaseStore ? "supabase-api" : "supabase-postgres";
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
  if (!databaseStore) return localStore.insert(indication);
  return databaseStore.insert(indication);
}

async function listIndications(status) {
  if (!databaseStore) return localStore.list(status);
  return databaseStore.list(status);
}

async function updateIndicationStatus(id, status) {
  if (!databaseStore) return localStore.updateStatus(id, status);
  return databaseStore.updateStatus(id, status);
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

export default app;
