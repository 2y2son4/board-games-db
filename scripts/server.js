import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const ADMIN = join(ROOT, "admin");
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const VALID_ACTIONS = ["import", "update", "validate", "build"];
const VALID_LANGUAGES = ["en", "es", "de", "x"];
const VALID_SIZES = ["xs", "s", "m", "l"];

function buildArgs(action, ids, language, size) {
  switch (action) {
    case "import":
    case "update": {
      const idList = ids.split(/[\s,]+/).filter(Boolean);
      if (!idList.length || !idList.every((id) => /^\d+$/.test(id))) {
        return null;
      }
      const args = ["scripts/import-bgg.js", ...idList];
      if (action === "update") args.push("--update");
      if (VALID_LANGUAGES.includes(language))
        args.push(`--language=${language}`);
      if (VALID_SIZES.includes(size)) args.push(`--size=${size}`);
      return args;
    }
    case "validate":
      return ["scripts/validate.js"];
    case "build":
      return ["scripts/build.js"];
    default:
      return null;
  }
}

const server = createServer(async (req, res) => {
  // --- API endpoint ---
  if (req.method === "POST" && req.url === "/api/run") {
    let body = "";
    for await (const chunk of req) body += chunk;

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    const { action, ids = "", language = "en", size = "m" } = payload;

    if (!VALID_ACTIONS.includes(action)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unknown action" }));
    }

    const args = buildArgs(action, ids, language, size);
    if (!args) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          error: "Invalid parameters — check BGG IDs are numeric",
        }),
      );
    }

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    });

    const child = spawn("node", args, { cwd: ROOT, env: { ...process.env } });

    child.stdout.on("data", (data) => res.write(data));
    child.stderr.on("data", (data) => res.write(data));
    child.on("close", (code) => {
      res.write(`\n--- Finished (exit ${code}) ---\n`);
      res.end();
    });
    child.on("error", (err) => {
      res.write(`\nError: ${err.message}\n`);
      res.end();
    });
    return;
  }

  // --- Static file serving ---
  const urlPath = req.url.split("?")[0];
  const filePath = urlPath === "/" ? "/index.html" : urlPath;

  if (filePath.includes("..")) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  const ext = extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  try {
    const data = await readFile(join(ADMIN, filePath));
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  Admin panel → http://localhost:${PORT}\n`);
});
