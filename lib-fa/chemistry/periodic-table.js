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
  nonmetal: "نافلز", "noble-gas": "گاز نجیب", alkali: "فلز قلیایی", "alkaline-earth": "فلز قلیایی خاکی",
  metalloid: "شبه‌فلز", halogen: "هالوژن", "post-transition": "فلز پس‌از واسطه", transition: "فلز واسطه",
  lanthanide: "لانتانید", actinide: "اکتینید"
};
const COLOR = {
  nonmetal: "#c8e6c9", "noble-gas": "#e1bee7", alkali: "#ffcdd2", "alkaline-earth": "#ffe0b2", metalloid: "#b2dfdb",
  halogen: "#fff9c4", "post-transition": "#cfd8dc", transition: "#bbdefb", lanthanide: "#f8bbd0", actinide: "#d7ccc8"
};
const GROUP_HEAD = Array.from({ length: 18 }, (_, i) => String(i + 1));
const SELECTED = "#d32f2f";

export const meta = {
  description: "جستجوی هر عنصر با نماد یا نام فارسی یا انگلیسی یا عدد اتمی، و نمایش گروه و دوره و جرم اتمی و بلوک و آرایش الکترونی و الکترون‌های ظرفیت، همراه با جدول تناوبی کامل که عنصر انتخابی را نشان می‌دهد.",
  keywords: ["جدول تناوبی", "عنصر", "periodic table", "element", "آرایش الکترونی", "electron configuration", "عدد اتمی", "الکترون‌های ظرفیت", "جرم اتمی", "Aufbau", "اوفباو"],
  formulas: [
    { label: "ترتیب اوفباو (Madelung)", tex: "1s \\to 2s \\to 2p \\to 3s \\to 3p \\to 4s \\to 3d \\to \\cdots" },
    { label: "تعداد الکترون‌ها", tex: "Z = \\text{تعداد پروتون‌ها} = \\text{تعداد الکترون‌ها (خنثی)}" }
  ],
  inputs: [
    { id: "el", label: "عنصر", type: "text", default: "Fe", help: "نماد مانند Fe یا نام مانند آهن یا Iron یا عدد اتمی مانند 26 را وارد کنید." }
  ],
  example: { values: { el: "Fe" }, expect: ["[Ar] 3d6 4s2"], note: "مثال: آهن Fe، Z = 26." },
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
  return { type: "table", caption: "جدول تناوبی (عنصر انتخابی با رنگ قرمز)", head: GROUP_HEAD, rows, ltr: true };
}

export function solve(input) {
  const raw = str(input, "el", "عنصر");
  const el = find(raw);
  if (!el) fail(`عنصری با نام یا نماد یا عدد اتمی «${raw}» یافت نشد. نمادی مانند Fe یا نامی مانند آهن یا عددی از 1 تا 118 وارد کنید.`, "el");
  const b = block(el);
  const cfg = configuration(el);
  const val = valence(el);
  const groupLabel = el.group === null ? (el.category === "actinide" ? "اکتینیدها" : "لانتانیدها") : String(el.group);
  const results = [
    { label: "نام فارسی", value: el.ar },
    { label: "نام انگلیسی", value: el.en },
    { label: "نماد", value: el.symbol },
    { label: "عدد اتمی Z", value: String(el.z) },
    { label: "جرم اتمی", value: `${fmt(el.mass, 6)} u` },
    { label: "گروه", value: groupLabel },
    { label: "دوره", value: String(el.period) },
    { label: "بلوک (block)", value: `${b}-block` },
    { label: "دسته", value: CAT_AR[el.category] },
    { label: "آرایش الکترونی", value: cfg }
  ];
  if (val !== null) results.push({ label: "الکترون‌های ظرفیت", value: String(val) });
  const steps = [
    `تعداد الکترون‌ها در اتم خنثی برابر عدد اتمی Z = ${el.z} است.`,
    "اوربیتال‌ها را پس از گاز نجیب قبلی به ترتیب اوفباو (Madelung) پر می‌کنیم و سپس بر اساس n و سپس l مرتب می‌کنیم."
  ];
  if (EXC[el.symbol]) steps.push("این عنصر از استثناهای شناخته‌شده در آرایش الکترونی است، پس آرایش پذیرفته‌شده را به کار می‌بریم.");
  steps.push(`آرایش الکترونی: ${cfg}.`);
  if (val !== null) steps.push(`الکترون‌های ظرفیت عنصر از گروه ${b}: ${val}.`);
  return {
    results,
    steps,
    blocks: [table(el)],
    copy: `${el.ar} (${el.symbol})، Z = ${el.z}، جرم اتمی ${fmt(el.mass, 6)} u، آرایش الکترونی ${cfg}`
  };
}
