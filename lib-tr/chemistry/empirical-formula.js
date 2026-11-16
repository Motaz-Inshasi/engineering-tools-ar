import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "Kütlece yüzdelerden veya element kütlelerinden en basit oranı (ampirik formül) bulun; molar kütle biliniyorsa moleküler formülü de bulun ve mol sayılarının en küçük değerine bölme tablosunu gösterin.",
  keywords: ["ampirik formül", "moleküler formül", "empirical formula", "molecular formula", "Elementel analiz", "yüzde", "en basit oran"],
  formulas: [
    { label: "Her elementin mol sayısı ve en basit oran", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "moleküler formül", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "Elementler ve oranları ya da kütleleri", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "Her satır bir element: sembol, ardından yüzde veya gram cinsinden kütle, örn. C 40 veya Na: 2.3" },
    { id: "M", label: "Bileşiğin molar kütlesi (isteğe bağlı)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "Örnek: yüzdeleri C %40, H %6.71, O %53.29 ve molar kütlesi 180.16 g/mol olan bileşik." },
  invalid: { values: { data: "C 40\nXx 60", M: "" } },
  related: ["molar-mass", "stoichiometry", "equation-balancer", "periodic-table"]
};

const ORDER = (els) => {
  const hasC = els.includes("C");
  return [...els].sort((a, b) => {
    if (hasC) {
      const r = (x) => (x === "C" ? 0 : x === "H" ? 1 : 2);
      if (r(a) !== r(b)) return r(a) - r(b);
    }
    return a.localeCompare(b);
  });
};

const write = (counts) => ORDER(Object.keys(counts)).map((el) => `${el}${counts[el] === 1 ? "" : counts[el]}`).join("");

export function solve(input) {
  const lines = str(input, "data", "Elementler").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`${i + 1}. satır anlaşılmadı. Örneğin şöyle yazın: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» tanınan bir element sembolü değil.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`${sym} elementi tekrar ediyor.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`${sym} değeri pozitif bir sayı olmalıdır.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("En az iki element girin.", "data");
  for (const it of items) it.n = it.v / BY_SYMBOL[it.sym].mass;
  const min = Math.min(...items.map((x) => x.n));
  for (const it of items) it.r = it.n / min;
  let mult = 0, best = null;
  for (let k = 1; k <= 12; k++) {
    const err = Math.max(...items.map((x) => Math.abs(x.r * k - Math.round(x.r * k)) / Math.max(1, Math.round(x.r * k))));
    if (err < 0.04) { mult = k; break; }
    if (!best || err < best.err) best = { k, err };
  }
  const warn = !mult;
  if (!mult) mult = best.k;
  const counts = Object.fromEntries(items.map((x) => [x.sym, Math.round(x.r * mult)]));
  const emp = write(counts), Me = molarMass(counts);
  const total = items.reduce((a, x) => a + x.v, 0);
  const steps = [
    Math.abs(total - 100) < 1.5 ? "Toplam yaklaşık 100 olduğundan değerleri yüzde kabul eder ve 100 g'lık bir numune varsayarız." : `Değerleri gram cinsinden kütle kabul ederiz (toplamı ${fmt(total, 5)} g).`,
    { text: "Her kütleyi atom kütlesine bölerek mola çeviriyoruz:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `En küçük mol sayısına (${fmt(min, 5)}) bölüyoruz: ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `Oranlar tam sayı değil, bu nedenle ${mult} ile çarpıyoruz: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}, sonra yuvarlıyoruz.` : "Oranlar tam sayılara yakın, bu nedenle yuvarlıyoruz.",
    { text: "Ampirik formül (Hill sırasıyla) ve kütlesi:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "ampirik formül", value: emp }, { label: "Ampirik formül kütlesi", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `Ampirik formül: ${emp}`;
  const blocks = [{ type: "table", caption: "En basit oranın hesabı", head: ["Element", "Değer", "Mol", "÷ en küçük", `× ${mult}`, "Sayı"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "Oranlar tam sayılara açıkça yakın değil; verilerin doğruluğunu kontrol edin. En yakın yuvarlamayı seçtik." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "Molar kütle", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`Molar kütle ${fmt(M)}, ampirik formül kütlesinin (${fmt(Me, 5)}) tam katı değil. Oran ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "Moleküler formül:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "moleküler formül", value: mf });
    copy += ` | moleküler formül: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
