import { ELEMENTS } from "./elements.js";
import { fail, str } from "../core/validate.js";
import { fmt } from "../core/format.js";

const NOBLE = [[2, "He"], [10, "Ne"], [18, "Ar"], [36, "Kr"], [54, "Xe"], [86, "Rn"]];
const ORDER = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1], [6, 0], [4, 3], [5, 2], [6, 1], [7, 0], [5, 3], [6, 2], [7, 1]];
const LETTER = "spdf";
const EXC = {
  Cr: "[Ar] 3d5 4s1", Cu: "[Ar] 3d10 4s1", Nb: "[Kr] 4d4 5s1", Mo: "[Kr] 4d5 5s1", Ru: "[Kr] 4d7 5s1", Rh: "[Kr] 4d8 5s1",
  Pd: "[Kr] 4d10", Ag: "[Kr] 4d10 5s1", La: "[Xe] 5d1 6s2", Ce: "[Xe] 4f1 5d1 6s2", Gd: "[Xe] 4f7 5d1 6s2",
  Pt: "[Xe] 4f14 5d9 6s1", Au: "[Xe] 4f14 5d10 6s1", Ac: "[Rn] 6d1 7s2", Th: "[Rn] 6d2 7s2", Pa: "[Rn] 5f2 6d1 7s2",
  U: "[Rn] 5f3 6d1 7s2", Np: "[Rn] 5f4 6d1 7s2", Cm: "[Rn] 5f7 6d1 7s2"
};
const CAT_AR = {
  nonmetal: "غیر دھاتی", "noble-gas": "نوبل گیس", alkali: "الکلی دھات", "alkaline-earth": "الکلی ارتھ دھات",
  metalloid: "میٹالائیڈ", halogen: "ہیلوجن", "post-transition": "ٹرانزیشن کے بعد کی دھات", transition: "ٹرانزیشن دھات",
  lanthanide: "لینتھینائیڈ", actinide: "ایکٹینائیڈ"
};
const COLOR = {
  nonmetal: "#c8e6c9", "noble-gas": "#e1bee7", alkali: "#ffcdd2", "alkaline-earth": "#ffe0b2", metalloid: "#b2dfdb",
  halogen: "#fff9c4", "post-transition": "#cfd8dc", transition: "#bbdefb", lanthanide: "#f8bbd0", actinide: "#d7ccc8"
};
const GROUP_HEAD = Array.from({ length: 18 }, (_, i) => String(i + 1));
const SELECTED = "#d32f2f";

export const meta = {
  description: "کسی بھی عنصر کو علامت، عربی یا انگریزی نام، یا ایٹمی نمبر سے تلاش کریں، اور اس کا گروپ، پیریڈ، ایٹمی کمیت، بلاک، الیکٹرانک کنفیگریشن اور ویلنس الیکٹرانز دکھائیں، ساتھ مکمل پیریوڈک ٹیبل جس میں منتخب عنصر نمایاں ہو۔",
  keywords: ["پیریوڈک ٹیبل", "عنصر", "periodic table", "element", "الیکٹرانک کنفیگریشن", "electron configuration", "ایٹمی نمبر", "ویلنس الیکٹرانز", "ایٹمی کمیت", "Aufbau", "آوف باؤ"],
  formulas: [
    { label: "آوف باؤ ترتیب (Madelung)", tex: "1s \\to 2s \\to 2p \\to 3s \\to 3p \\to 4s \\to 3d \\to \\cdots" },
    { label: "الیکٹرانز کی تعداد", tex: "Z = \\text{پروٹونز کی تعداد} = \\text{الیکٹرانز کی تعداد (متعادل)}" }
  ],
  inputs: [
    { id: "el", label: "عنصر", type: "text", default: "Fe", help: "علامت جیسے Fe، نام جیسے آئرن یا Iron، یا ایٹمی نمبر جیسے 26 درج کریں۔" }
  ],
  example: { values: { el: "Fe" }, expect: ["[Ar] 3d6 4s2"], note: "مثال: آئرن Fe، Z = 26۔" },
  invalid: { values: { el: "Xx" } },
  related: ["solutions", "ph-calculator", "reaction-kinetics", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function block(el) {
  if (el.z === 2) return "s";
  if (el.category === "lanthanide" || el.category === "actinide") return "f";
  if (el.group <= 2) return "s";
  if (el.group <= 12) return "d";
  return "p";
}

function valence(el) {
  if (el.z === 2) return 2;
  const b = block(el);
  if (b === "s") return el.group;
  if (b === "p") return el.group - 10;
  return null;
}

function aufbau(count) {
  let left = count;
  const out = [];
  for (const [n, l] of ORDER) {
    if (left <= 0) break;
    const c = Math.min(left, 2 * (2 * l + 1));
    out.push({ n, l, c });
    left -= c;
  }
  return out;
}

function configuration(el) {
  if (EXC[el.symbol]) return EXC[el.symbol];
  let core = "", coreZ = 0;
  for (const [z, s] of NOBLE) if (z < el.z) { core = s; coreZ = z; }
  const coreOrbitals = aufbau(coreZ);
  const parts = aufbau(el.z)
    .map((p) => {
      const used = coreOrbitals.find((q) => q.n === p.n && q.l === p.l);
      return { n: p.n, l: p.l, c: p.c - (used ? used.c : 0) };
    })
    .filter((p) => p.c > 0);
  parts.sort((a, b) => a.n - b.n || a.l - b.l);
  const body = parts.map((p) => `${p.n}${LETTER[p.l]}${p.c}`).join(" ");
  return core ? `[${core}] ${body}` : body;
}

function find(raw) {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return ELEMENTS.find((e) => e.z === Number(s));
  const low = s.toLowerCase();
  return ELEMENTS.find((e) => e.symbol.toLowerCase() === low || e.en.toLowerCase() === low || e.ar === s);
}

function table(el) {
  const rows = Array.from({ length: 9 }, () => Array(18).fill(null));
  for (const e of ELEMENTS) {
    const selected = e.z === el.z;
    const cell = selected ? { text: e.symbol, color: SELECTED, fg: "#ffffff" } : { text: e.symbol, color: COLOR[e.category] };
    let r, c;
    if (e.z >= 57 && e.z <= 71) { r = 7; c = e.z - 57 + 2; }
    else if (e.z >= 89 && e.z <= 103) { r = 8; c = e.z - 89 + 2; }
    else { r = e.period - 1; c = e.group - 1; }
    rows[r][c] = cell;
  }
  return { type: "table", caption: "پیریوڈک ٹیبل (منتخب عنصر سرخ رنگ میں)", head: GROUP_HEAD, rows, ltr: true };
}

export function solve(input) {
  const raw = str(input, "el", "عنصر");
  const el = find(raw);
  if (!el) fail(`نام، علامت یا ایٹمی نمبر “${raw}” کا کوئی عنصر نہیں ملا۔ علامت جیسے Fe، نام جیسے آئرن، یا 1 سے 118 تک کا نمبر درج کریں۔`, "el");
  const b = block(el);
  const cfg = configuration(el);
  const val = valence(el);
  const groupLabel = el.group === null ? (el.category === "actinide" ? "ایکٹینائیڈز" : "لینتھینائیڈز") : String(el.group);
  const results = [
    { label: "عربی نام", value: el.ar },
    { label: "انگریزی نام", value: el.en },
    { label: "علامت", value: el.symbol },
    { label: "ایٹمی نمبر Z", value: String(el.z) },
    { label: "ایٹمی کمیت", value: `${fmt(el.mass, 6)} u` },
    { label: "گروپ", value: groupLabel },
    { label: "پیریڈ", value: String(el.period) },
    { label: "بلاک", value: `${b}-block` },
    { label: "زمرہ", value: CAT_AR[el.category] },
    { label: "الیکٹرانک کنفیگریشن", value: cfg }
  ];
  if (val !== null) results.push({ label: "ویلنس الیکٹرانز", value: String(val) });
  const steps = [
    `متعادل ایٹم میں الیکٹرانز کی تعداد ایٹمی نمبر Z = ${el.z} کے برابر ہے۔`,
    "ہم پچھلی نوبل گیس کے بعد اوربیٹالز کو آوف باؤ (Madelung) ترتیب سے بھرتے ہیں، پھر انہیں پہلے n اور پھر l کے مطابق ترتیب دیتے ہیں۔"
  ];
  if (EXC[el.symbol]) steps.push("یہ عنصر الیکٹرانک کنفیگریشن کے معروف استثنیٰ میں سے ہے، اس لیے ہم تسلیم شدہ کنفیگریشن استعمال کرتے ہیں۔");
  steps.push(`الیکٹرانک کنفیگریشن: ${cfg}۔`);
  if (val !== null) steps.push(`گروپ ${b} کے عنصر کے ویلنس الیکٹرانز: ${val}۔`);
  return {
    results,
    steps,
    blocks: [table(el)],
    copy: `${el.ar} (${el.symbol})، Z = ${el.z}، ایٹمی کمیت ${fmt(el.mass, 6)} u، الیکٹرانک کنفیگریشن ${cfg}`
  };
}
