import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "Investasi tidak kembali dalam jangka waktu";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "Hitung nilai sekarang bersih (NPV), tingkat pengembalian internal (IRR), indeks profitabilitas, dan periode pengembalian biasa serta terdiskonto untuk serangkaian arus kas, dengan tabel tahunan nilai sekarang dan kumulatif.",
  keywords: ["nilai sekarang bersih", "NPV", "tingkat pengembalian internal", "IRR", "periode pengembalian", "payback", "indeks profitabilitas", "studi kelayakan"],
  formulas: [
    { label: "nilai sekarang bersih", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "tingkat pengembalian internal", tex: "NPV(IRR) = 0" },
    { label: "indeks profitabilitas", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "Tingkat diskonto", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "Arus kas CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "Mulai dengan arus awal CF0 (biasanya negatif), lalu arus tahunan. Pisahkan nilai dengan spasi atau koma." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "Contoh: investasi 1000 menghasilkan 300, 400, dan 500 pada tiga tahun berikutnya dengan tingkat diskonto 10%." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "Tingkat diskonto", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "Arus kas", { min: 2, max: 200 });
  if (cf[0] === 0) fail("Arus awal CF0 tidak boleh sama dengan nol.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("NPV tidak dapat dihitung pada tingkat ini, coba tingkat yang lebih besar.", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "Tidak terdefinisi" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} tahun`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} tahun`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "Nilai sekarang bersih = jumlah nilai sekarang arus kas:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "Tingkat pengembalian internal adalah tingkat yang membuat NPV = 0. Kita mencari perubahan tanda pertama NPV pada rentang −99% hingga 1000%, lalu mempersempit interval dengan pembagian dua.",
    "Periode pengembalian: tahun terakhir saat saldo kumulatif masih negatif, lalu ditambahkan bagian pecahan dari tahun berikutnya.",
    `Indeks profitabilitas = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "Tabel nilai sekarang dan kumulatif", head: ["Tahun", "Arus kas", "Faktor diskonto", "Nilai sekarang", "Kumulatif", "Kumulatif terdiskonto"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "Tidak ada perubahan tanda NPV pada rentang −99% hingga 1000%, sehingga tingkat pengembalian internal tidak dapat ditentukan.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "Ditemukan lebih dari satu tingkat pengembalian internal untuk arus kas ini, dan yang ditampilkan adalah yang terkecil." });
  return {
    results: [
      { label: "Nilai sekarang bersih NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "Tingkat pengembalian internal IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "periode pengembalian", value: pbText },
      { label: "Periode pengembalian terdiskonto", value: dpbText },
      { label: "Indeks profitabilitas PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}, IRR = ${irrText}, indeks profitabilitas PI = ${fmt(PI, 4)}`,
    blocks
  };
}
