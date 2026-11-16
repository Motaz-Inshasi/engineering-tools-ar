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
  nonmetal: "Ametal", "noble-gas": "Soy gaz", alkali: "Alkali metal", "alkaline-earth": "Toprak alkali metal",
  metalloid: "Yarı metal", halogen: "Halojen", "post-transition": "Geçiş sonrası metal", transition: "Geçiş metali",
  lanthanide: "Lantanit", actinide: "Aktinit"
};
const COLOR = {
  nonmetal: "#c8e6c9", "noble-gas": "#e1bee7", alkali: "#ffcdd2", "alkaline-earth": "#ffe0b2", metalloid: "#b2dfdb",
  halogen: "#fff9c4", "post-transition": "#cfd8dc", transition: "#bbdefb", lanthanide: "#f8bbd0", actinide: "#d7ccc8"
};
const GROUP_HEAD = Array.from({ length: 18 }, (_, i) => String(i + 1));
const SELECTED = "#d32f2f";

export const meta = {
  description: "Bir elementi sembolü, Arapça veya İngilizce adıyla ya da atom numarasıyla arayın; grup, periyot, atom kütlesi, blok, elektron dizilimi ve değerlik elektronlarını, seçilen elementin renkle vurgulandığı tam periyodik tabloyla birlikte gösterin.",
  keywords: ["periyodik tablo", "element", "periodic table", "element", "elektron dizilimi", "electron configuration", "atom numarası", "değerlik elektronları", "atom kütlesi", "Aufbau", "Aufbau"],
  formulas: [
    { label: "Aufbau (Madelung) sırası", tex: "1s \\to 2s \\to 2p \\to 3s \\to 3p \\to 4s \\to 3d \\to \\cdots" },
    { label: "Z = proton sayısı = nötr atomdaki elektron sayısı", tex: "Z = \\text{proton sayısı} = \\text{elektron sayısı (nötr)}" }
  ],
  inputs: [
    { id: "el", label: "Element", type: "text", default: "Fe", help: "Sembolü Fe, adı demir veya Iron ya da atom numarası 26 gibi girin." }
  ],
  example: { values: { el: "Fe" }, expect: ["[Ar] 3d6 4s2"], note: "Örnek: demir Fe, Z = 26." },
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
  return { type: "table", caption: "Periyodik tablo (seçilen element kırmızıyla)", head: GROUP_HEAD, rows, ltr: true };
}

export function solve(input) {
  const raw = str(input, "el", "Element");
  const el = find(raw);
  if (!el) fail(`«${raw}» adı, sembolü veya atom numarasıyla bir element bulunamadı. Fe gibi bir sembol, demir gibi bir ad ya da 1 ile 118 arasında bir sayı girin.`, "el");
  const b = block(el);
  const cfg = configuration(el);
  const val = valence(el);
  const groupLabel = el.group === null ? (el.category === "actinide" ? "Aktinitler" : "Lantanitler") : String(el.group);
  const results = [
    { label: "Arapça adı", value: el.ar },
    { label: "İngilizce adı", value: el.en },
    { label: "Sembol", value: el.symbol },
    { label: "Atom numarası Z", value: String(el.z) },
    { label: "Atom kütlesi", value: `${fmt(el.mass, 6)} u` },
    { label: "Grup", value: groupLabel },
    { label: "Periyot", value: String(el.period) },
    { label: "Blok", value: `${b}-block` },
    { label: "Sınıf", value: CAT_AR[el.category] },
    { label: "Elektron dizilimi", value: cfg }
  ];
  if (val !== null) results.push({ label: "değerlik elektronları", value: String(val) });
  const steps = [
    `Nötr atomda elektron sayısı, atom numarası Z = ${el.z} kadardır.`,
    "Soy gazdan sonra Aufbau (Madelung) sırasıyla orbitalleri doldurur, sonra n'ye ve l'ye göre sıralarız."
  ];
  if (EXC[el.symbol]) steps.push("Bu element elektron dizilimindeki bilinen istisnalardan biridir; kabul edilen dizilimi kullanırız.");
  steps.push(`Elektron dizilimi: ${cfg}.`);
  if (val !== null) steps.push(`${b} bloğundaki elementin değerlik elektronları: ${val}.`);
  return {
    results,
    steps,
    blocks: [table(el)],
    copy: `${el.ar} (${el.symbol}), Z = ${el.z}, atom kütlesi ${fmt(el.mass, 6)} u, elektron dizilimi ${cfg}`
  };
}
