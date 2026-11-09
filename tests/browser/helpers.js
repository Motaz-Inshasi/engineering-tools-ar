import { categories, tools } from "../../assets/js/registry.js";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function liveTools() {
  const out = [];
  for (const t of tools) {
    const p = join(ROOT, "lib", t.category, `${t.slug}.js`);
    if (!existsSync(p) || !readFileSync(p, "utf8").trim()) continue;
    const mod = await import(pathToFileURL(p).href);
    if (mod.meta) out.push({ ...t, meta: mod.meta, solve: mod.solve });
  }
  return out;
}

export function watch(page) {
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()} @ ${m.location()?.url || ""}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
  return problems;
}

export async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

export { categories, tools };
