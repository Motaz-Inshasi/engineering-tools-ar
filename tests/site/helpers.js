import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP = new Set(["node_modules", ".git", "tests", "test-results", "playwright-report", "scripts", ".claude"]);

export function walk(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export const rel = (p) => relative(ROOT, p).split(sep).join("/");

export function htmlFiles() {
  return walk().filter((p) => p.endsWith(".html"));
}

export function attrs(html, name) {
  const re = new RegExp(`\\s${name}="([^"]*)"`, "g");
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

export function resolveTarget(fromFile, url) {
  const clean = url.split("#")[0].split("?")[0];
  if (clean === "") return fromFile;
  let p = join(dirname(fromFile), clean);
  if (clean.endsWith("/") || (existsSync(p) && statSync(p).isDirectory())) p = join(p, "index.html");
  return p;
}

export function read(p) {
  return readFileSync(p, "utf8");
}
