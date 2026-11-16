import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, tex as ntex } from "../core/format.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";

export const meta = {
  description: "حل مدارهای مسطح با تحلیل حلقه‌ها (جریان‌های حلقه‌ای): ساختن معادلات KVL و ماتریس مقاومت و حل آن‌ها، سپس جریان هر شاخه، با بررسی KVL در هر حلقه.",
  keywords: ["تحلیل حلقه‌ها", "mesh analysis", "KVL", "قانون ولتاژ کیرشهف", "جریان‌های حلقه‌ای", "ماتریس مقاومت"],
  formulas: [
    { label: "قانون ولتاژ کیرشهف برای هر حلقه", tex: "\\sum_{\\text{loop}} R\\,I = \\sum_{\\text{loop}} V_s" },
    { label: "صورت ماتریسی", tex: "R_{ii} = \\sum R_{\\text{loop } i},\\quad R_{ij} = -R_{\\text{shared}},\\quad [R]\\,\\mathbf{I} = \\mathbf{V}" }
  ],
  inputs: [
    { id: "br", label: "شاخه‌ها", type: "textarea", rows: 6, default: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5", help: "هر سطر یک شاخه: حلقه1 حلقه2 مقاومت ولتاژ. حلقه2 = 0 است اگر شاخه روی لبه بیرونی باشد. ولتاژ مثبت است اگر جریانی در جهت چرخش حلقه1 (ساعت‌گرد) ایجاد کند." }
  ],
  example: { values: { br: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5" }, expect: ["I1 = 1.81818 A", "I2 = 227.273 mA"], note: "مثال: دو حلقه که یک مقاومت 4 Ω مشترک دارند، با منبع 10 V در حلقه اول و منبع 5 V مخالف در حلقه دوم." },
  invalid: { values: { br: "1 0 0 5" } },
  related: ["nodal-analysis", "thevenin-norton", "linear-system"]
};

export function parseBranches(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("شاخه‌های مدار را وارد کنید، هر شاخه در یک سطر.", "br");
  if (lines.length > 50) fail("حداکثر تعداد شاخه‌ها 50 است.", "br");
  return lines.map((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `سطر ${i + 1} («${line}»)`;
    if (p.length < 3 || p.length > 4) fail(`${where}: قالب: حلقه1 حلقه2 مقاومت [ولتاژ].`, "br");
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 0) fail(`${where}: شماره حلقه اول از 1 شروع می‌شود، و حلقه دوم 0 یا شماره یک حلقه است.`, "br");
    if (a === b) fail(`${where}: دو حلقه یکسان‌اند.`, "br");
    const R = parseNumber(p[2]), V = p.length === 4 ? parseNumber(p[3]) : 0;
    if (!isFinite(R) || R < 0) fail(`${where}: مقاومت باید عددی نامنفی باشد.`, "br");
    if (!isFinite(V)) fail(`${where}: ولتاژ عدد معتبری نیست.`, "br");
    return { a, b, R, V, line };
  });
}

export function meshSolve(branches) {
  const M = Math.max(...branches.flatMap((x) => [x.a, x.b]));
  for (let k = 1; k <= M; k++) if (!branches.some((x) => x.a === k || x.b === k)) fail(`حلقه ${k} هیچ شاخه‌ای ندارد. حلقه‌ها را از 1 به ترتیب شماره‌گذاری کنید.`, "br");
  const R = Array.from({ length: M }, () => new Array(M).fill(0));
  const V = new Array(M).fill(0);
  for (const x of branches) {
    R[x.a - 1][x.a - 1] += x.R;
    V[x.a - 1] += x.V;
    if (x.b > 0) {
      R[x.b - 1][x.b - 1] += x.R;
      R[x.a - 1][x.b - 1] -= x.R;
      R[x.b - 1][x.a - 1] -= x.R;
      V[x.b - 1] -= x.V;
    }
  }
  const res = solveLinear(R, V);
  if (res.rankA < M) fail("ماتریس مقاومت تکین است: مطمئن شوید هر حلقه مقاومت دارد و حلقه‌ها مستقل‌اند.", "br");
  const I = res.R.slice(0, M).map((r) => r[M]);
  return { M, R, V, I };
}

export function solve(input) {
  const branches = parseBranches(str(input, "br", "شاخه‌ها"));
  const { M, R, V, I } = meshSolve(branches);
  const steps = [`تعداد حلقه‌ها ${M}. در هر حلقه جریان حلقه $I_k$ را ساعت‌گرد فرض می‌کنیم.`];
  for (let k = 0; k < M; k++) {
    const lhs = R[k].map((r, j) => (r === 0 ? null : `${j === k ? "" : ""}${ntex(r)} I_{${j + 1}}`)).filter(Boolean).join(" + ").replace(/\+ -/g, "- ");
    steps.push({ text: `KVL در حلقه ${k + 1} (مقاومت خودی روی قطر، و مقاومت‌های مشترک با علامت منفی):`, tex: `${lhs} = ${ntex(V[k])}` });
  }
  steps.push({ text: "به صورت ماتریسی:", tex: `${matTex(R)}\\begin{bmatrix}${I.map((_, k) => `I_{${k + 1}}`).join("\\\\")}\\end{bmatrix} = ${matTex(V.map((v) => [v]))}` });
  const resid = mvec(R, I).map((x, k) => x - V[k]);
  steps.push({ text: "پس از حل، جریان‌ها را در معادلات KVL قرار دادیم؛ بیشترین اختلاف برابر بود با:", tex: `${ntex(Math.max(...resid.map(Math.abs)), 2)}\\ V` });
  const rows = branches.map((x) => {
    const ib = I[x.a - 1] - (x.b > 0 ? I[x.b - 1] : 0);
    return [x.line, x.b > 0 ? `I${x.a} − I${x.b}` : `I${x.a}`, eng(ib, "A", 5), eng(ib * x.R, "V", 5), eng(ib * ib * x.R, "W", 4)];
  });
  steps.push("جریان شاخه مشترک بین دو حلقه برابر تفاوت جریان دو حلقه است.");
  return {
    results: I.map((i, k) => ({ label: `جریان حلقه ${k + 1}`, value: eng(i, "A", 6), text: `I${k + 1} = ${eng(i, "A", 6)}` })),
    blocks: [{ type: "table", caption: "جریان شاخه‌ها (در جهت چرخش حلقه اول مثبت‌اند)", head: ["شاخه", "جریان", "مقدار", "ولتاژ مقاومت", "توان مقاومت"], rows }],
    steps, copy: I.map((i, k) => `I${k + 1} = ${eng(i, "A", 6)}`).join("\n")
  };
}
