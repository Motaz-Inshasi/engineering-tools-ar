import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const lin = (k) => ({ to: (x) => x * k, from: (b) => b / k, k });

export const UNITS = {
  length: { ar: "الطول", base: "m", units: { m: ["متر", lin(1)], km: ["كيلومتر", lin(1e3)], cm: ["سنتيمتر", lin(1e-2)], mm: ["مليمتر", lin(1e-3)], um: ["ميكرومتر", lin(1e-6)], nm: ["نانومتر", lin(1e-9)], in: ["بوصة", lin(0.0254)], ft: ["قدم", lin(0.3048)], yd: ["ياردة", lin(0.9144)], mi: ["ميل", lin(1609.344)], nmi: ["ميل بحري", lin(1852)], mil: ["mil (1/1000 بوصة)", lin(2.54e-5)] } },
  energy: { ar: "الطاقة", base: "J", units: { J: ["جول", lin(1)], kJ: ["كيلوجول", lin(1e3)], MJ: ["ميغاجول", lin(1e6)], Wh: ["واط ساعة", lin(3600)], kWh: ["كيلوواط ساعة", lin(3.6e6)], cal: ["سعرة (حرارية دولية)", lin(4.1868)], kcal: ["كيلو سعرة", lin(4186.8)], eV: ["إلكترون فولت", lin(1.602176634e-19)], BTU: ["BTU (دولي)", lin(1055.05585262)], mAh5: ["mAh عند 5 V", lin(18)] } },
  temperature: { ar: "الحرارة", base: "K", units: { C: ["سلسيوس °C", { to: (x) => x + 273.15, from: (b) => b - 273.15 }], F: ["فهرنهايت °F", { to: (x) => (x - 32) * 5 / 9 + 273.15, from: (b) => (b - 273.15) * 9 / 5 + 32 }], K: ["كلفن K", lin(1)], R: ["رانكن °R", lin(5 / 9)] } },
  frequency: { ar: "التردد", base: "Hz", units: { Hz: ["هرتز", lin(1)], kHz: ["كيلوهرتز", lin(1e3)], MHz: ["ميغاهرتز", lin(1e6)], GHz: ["غيغاهرتز", lin(1e9)], rpm: ["دورة/دقيقة", lin(1 / 60)], rads: ["راديان/ثانية", lin(1 / (2 * Math.PI))], period: ["الدور بالثانية (1/f)", { to: (x) => 1 / x, from: (b) => 1 / b }] } },
  power: { ar: "القدرة", base: "W", units: { W: ["واط", lin(1)], mW: ["ملي واط", lin(1e-3)], kW: ["كيلوواط", lin(1e3)], MW: ["ميغاواط", lin(1e6)], hp: ["حصان ميكانيكي", lin(745.6998715822702)], PS: ["حصان متري", lin(735.49875)], dBm: ["dBm", { to: (x) => 1e-3 * Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b / 1e-3) }], dBW: ["dBW", { to: (x) => Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b) }], BTUh: ["BTU/ساعة", lin(0.29307107017)] } },
  charge: { ar: "الشحنة الكهربائية", base: "C", units: { C: ["كولوم", lin(1)], mC: ["ملي كولوم", lin(1e-3)], uC: ["مايكرو كولوم", lin(1e-6)], Ah: ["أمبير ساعة", lin(3600)], mAh: ["ملي أمبير ساعة", lin(3.6)], e: ["شحنة الإلكترون", lin(1.602176634e-19)] } }
};

const CATS = Object.entries(UNITS).map(([k, v]) => [k, v.ar]);
const opts = (cat) => Object.entries(UNITS[cat].units).map(([k, [ar]]) => [k, `${k} – ${ar}`]);
const DEF = { length: ["in", "mm"], energy: ["kWh", "MJ"], temperature: ["C", "F"], frequency: ["rpm", "Hz"], power: ["dBm", "mW"], charge: ["mAh", "C"] };

export const meta = {
  description: "حوّل بين وحدات الطول والطاقة والحرارة والتردد والقدرة (مع dBm) والشحنة الكهربائية (مع mAh)، مع جدول بقيمة المدخل بكل وحدات الفئة.",
  keywords: ["تحويل الوحدات", "unit converter", "بوصة", "مليمتر", "فهرنهايت", "سلسيوس", "dBm", "mAh", "كيلوواط ساعة", "حصان", "rpm"],
  formulas: [
    { label: "التحويل عبر وحدة أساسية", tex: "x_{to} = f_{to}^{-1}\\left(f_{from}(x)\\right)" },
    { label: "أمثلة غير خطية", tex: "T_F = \\tfrac{9}{5}T_C + 32,\\qquad P_{dBm} = 10\\log_{10}\\frac{P}{1\\,mW}" }
  ],
  inputs: [
    { id: "cat", label: "الفئة", type: "select", default: "length", options: CATS },
    { id: "x", label: "القيمة", type: "number", default: "1" },
    ...Object.keys(UNITS).flatMap((c) => [
      { id: `from_${c}`, label: "من", type: "select", default: DEF[c][0], options: opts(c), when: { cat: [c] } },
      { id: `to_${c}`, label: "إلى", type: "select", default: DEF[c][1], options: opts(c), when: { cat: [c] } }
    ])
  ],
  example: { values: { cat: "temperature", x: "100", from_temperature: "C", to_temperature: "F" }, expect: ["100 C = 212 F"], note: "مثال: 100 °C بالفهرنهايت." },
  invalid: { values: { cat: "temperature", x: "-300", from_temperature: "C", to_temperature: "K" } },
  related: ["engineering-notation", "formulas-constants", "standard-resistor-values"]
};

export function convert(cat, x, from, to) {
  const U = UNITS[cat].units;
  return U[to][1].from(U[from][1].to(x));
}

export function solve(input) {
  const cat = choice(input, "cat", "الفئة", Object.keys(UNITS), "length");
  const keys = Object.keys(UNITS[cat].units);
  const from = choice(input, `from_${cat}`, "الوحدة الأصلية", keys, DEF[cat][0]);
  const to = choice(input, `to_${cat}`, "الوحدة الهدف", keys, DEF[cat][1]);
  const x = num(input, "x", "القيمة");
  const U = UNITS[cat].units;
  const base = U[from][1].to(x);
  if (cat === "temperature" && base < 0) fail("درجة الحرارة أقل من الصفر المطلق (−273.15 °C)، وهذا مستحيل فيزيائياً.", "x");
  if (["frequency", "power", "length", "energy", "charge"].includes(cat) && (from === "period" || to === "period" || from === "dBm" || from === "dBW" || to === "dBm" || to === "dBW") && !(base > 0)) fail("هذا التحويل يحتاج قيمة موجبة.", "x");
  const y = U[to][1].from(base);
  if (!isFinite(y)) fail("التحويل لا يعطي قيمة محدودة.", "x");
  const steps = [
    { text: `نحوّل أولاً إلى الوحدة الأساسية للفئة (${UNITS[cat].base}):`, tex: `${ntex(x)}\\ \\text{${from}} = ${ntex(base, 10)}\\ \\text{${UNITS[cat].base}}` },
    { text: "ثم من الوحدة الأساسية إلى الوحدة الهدف:", tex: `${ntex(base, 10)}\\ \\text{${UNITS[cat].base}} = ${ntex(y, 10)}\\ \\text{${to}}` }
  ];
  if (U[from][1].k && U[to][1].k) steps.push(`معامل التحويل المباشر: 1 ${from} = ${fmt(U[from][1].k / U[to][1].k, 10)} ${to}.`);
  const rows = keys.map((k) => {
    let v;
    try { v = U[k][1].from(base); } catch { v = NaN; }
    return [`${k}`, U[k][0], isFinite(v) ? fmt(v, 8) : "—"];
  });
  const text = `${fmt(x)} ${from} = ${fmt(y, 10)} ${to}`;
  return {
    results: [{ label: "الناتج", value: text, text }],
    blocks: [{ type: "table", caption: `القيمة بكل وحدات ${UNITS[cat].ar}`, head: ["الرمز", "الوحدة", "القيمة"], rows }],
    steps, copy: text
  };
}
