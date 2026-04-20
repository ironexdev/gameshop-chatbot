import { readFileSync, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { runChat } from "./chat.js";
import { startMcp } from "./mcp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");

loadDotEnv(resolve(rootDir, ".env"));

const apiKey = requireEnv("ANTHROPIC_API_KEY");
const model = requireEnv("MODEL");
const port = Number(requireEnv("PORT"));
if (!Number.isFinite(port)) throw new Error("PORT must be a number");

const anthropic = new Anthropic({ apiKey });

const mcp = await startMcp();
console.log(`[mcp] connected. tools: ${mcp.tools.map((t) => t.name).join(", ")}`);

const widgetJs = resolve(rootDir, "widget/dist/widget.js");
const demoHtml = resolve(rootDir, "demo/index.html");
const diagramSvg = resolve(rootDir, "demo/gameshop_chatbot_diagram.svg");

const server = createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return serveFile(res, demoHtml, "text/html; charset=utf-8");
    }

    if (req.method === "GET" && url.pathname === "/widget.js") {
      return serveFile(res, widgetJs, "application/javascript; charset=utf-8");
    }

    if (req.method === "GET" && url.pathname === "/gameshop_chatbot_diagram.svg") {
      return serveFile(res, diagramSvg, "image/svg+xml; charset=utf-8");
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      const body = await readBody(req);
      let payload: { sessionId?: string; message?: string };
      try {
        payload = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "invalid_json" });
      }
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
      const message = typeof payload.message === "string" ? payload.message : "";
      if (!sessionId || !message) {
        return json(res, 400, { error: "sessionId_and_message_required" });
      }
      try {
        const reply = await runChat(anthropic, model, mcp, sessionId, message);
        return json(res, 200, { reply });
      } catch (err) {
        console.error("[chat] error", err);
        return json(res, 500, { error: "chat_failed" });
      }
    }

    return json(res, 404, { error: "not_found" });
  } catch (err) {
    console.error("[http] unhandled", err);
    if (!res.headersSent) json(res, 500, { error: "internal" });
  }
});

server.listen(port, () => {
  console.log(`[http] listening on http://localhost:${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[shutdown] ${sig}`);
    mcp.stop().finally(() => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1500).unref();
    });
  });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function serveFile(res: ServerResponse, path: string, mime: string): void {
  if (!existsSync(path)) {
    return json(res, 404, { error: "file_missing", path: path.replace(rootDir, "") });
  }
  const data = readFileSync(path);
  res.writeHead(200, { "content-type": mime });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rejectPromise);
  });
}

