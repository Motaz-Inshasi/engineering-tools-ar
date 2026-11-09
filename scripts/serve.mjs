import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, resolve, extname, normalize, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const PORT = Number(arg("port", process.env.PORT || 8080));
let BASE = arg("base", "/");
if (!BASE.startsWith("/")) BASE = "/" + BASE;
if (!BASE.endsWith("/")) BASE += "/";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8"
};

const BLOCKED = ["node_modules", ".git", "tests", "test-results", "playwright-report", "scripts"];

async function send(res, code, file) {
  const body = await readFile(file);
  res.writeHead(code, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p === BASE.slice(0, -1)) { res.writeHead(301, { Location: BASE }); return res.end(); }
    if (!p.startsWith(BASE)) return send(res, 404, join(ROOT, "404.html"));
    p = p.slice(BASE.length);
    const rel = normalize(p).replace(/^([/\\])+/, "");
    if (rel.split(sep).some((s) => s === ".." || BLOCKED.includes(s))) return send(res, 404, join(ROOT, "404.html"));
    let file = join(ROOT, rel);
    let st = await stat(file).catch(() => null);
    if (st && st.isDirectory()) {
      if (!p.endsWith("/") && p !== "") { res.writeHead(301, { Location: url.pathname + "/" }); return res.end(); }
      file = join(file, "index.html");
      st = await stat(file).catch(() => null);
    }
    if (!st) return send(res, 404, join(ROOT, "404.html"));
    return send(res, 200, file);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("server error");
  }
});

server.listen(PORT, () => {
  console.log(`الموقع يعمل على http://localhost:${PORT}${BASE}`);
});
