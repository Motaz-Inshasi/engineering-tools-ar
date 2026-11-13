import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CATS = [
  { name: "جيد", color: "#00e400", fg: "#000000", range: "0 – 50" },
  { name: "متوسط", color: "#ffff00", fg: "#000000", range: "51 – 100" },
  { name: "غير صحي للفئات الحساسة", color: "#ff7e00", fg: "#000000", range: "101 – 150" },
  { name: "غير صحي", color: "#ff0000", fg: "#ffffff", range: "151 – 200" },
  { name: "غير صحي جداً", color: "#8f3f97", fg: "#ffffff", range: "201 – 300" },
  { name: "خطر", color: "#7e0023", fg: "#ffffff", range: "301 – 500" }
];

const POLLUTANTS = {
  pm25: { name: "PM2.5 (متوسط 24 ساعة)", unit: "µg/m³", digits: 1, rows: [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]] },
  pm10: { name: "PM10 (متوسط 24 ساعة)", unit: "µg/m³", digits: 0, rows: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]] },
  o3: { name: "الأوزون O3 (متوسط 8 ساعات)", unit: "ppm", digits: 3, rows: [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300]] },
  co: { name: "أول أكسيد الكربون CO (متوسط 8 ساعات)", unit: "ppm", digits: 1, rows: [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]] },
  no2: { name: "ثاني أكسيد النيتروجين NO2 (ساعة)", unit: "ppb", digits: 0, rows: [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]] },
  so2: { name: "ثاني أكسيد الكبريت SO2 (ساعة)", unit: "ppb", digits: 0, rows: [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]] }
};

const KEYS = Object.keys(POLLUTANTS);

function truncate(x, digits) {
  const f = 10 ** digits;
  return Math.trunc(x * f + 1e-7) / f;
}

export const meta = {
  description: "احسب مؤشر جودة الهواء الأمريكي AQI لملوث واحد من تركيزه، مع تقريب التركيز حسب المعيار والفئة الصحية ولونها والاستيفاء الخطي خطوة بخطوة.",
  keywords: ["مؤشر جودة الهواء", "AQI", "EPA", "PM2.5", "PM10", "الأوزون", "ثاني أكسيد النيتروجين", "air quality index"],
  formulas: [
    { label: "الاستيفاء الخطي", tex: "I = \\frac{I_{hi}-I_{lo}}{C_{hi}-C_{lo}}\\,(C_p - C_{lo}) + I_{lo}" }
  ],
  inputs: [
    { id: "pollutant", label: "الملوث", type: "select", default: "pm25", options: [["pm25", "PM2.5 (µg/m³، متوسط 24 ساعة)"], ["pm10", "PM10 (µg/m³، متوسط 24 ساعة)"], ["o3", "الأوزون O3 (ppm، متوسط 8 ساعات)"], ["co", "CO (ppm، متوسط 8 ساعات)"], ["no2", "NO2 (ppb، متوسط ساعة)"], ["so2", "SO2 (ppb، متوسط ساعة)"]] },
    { id: "C", label: "التركيز", type: "number", default: "35.4", help: "أدخل التركيز بالوحدة الموضحة للملوث المختار." }
  ],
  example: { values: { pollutant: "pm25", C: "35.4" }, expect: ["AQI = 100", "متوسط"], note: "مثال: PM2.5 بتركيز 35.4 µg/m³." },
  invalid: { values: { pollutant: "pm25", C: "-1" } },
  related: ["carbon-footprint", "earthquake-magnitude"]
};

export function solve(input) {
  const key = choice(input, "pollutant", "الملوث", KEYS, "pm25");
  const p = POLLUTANTS[key];
  const raw = num(input, "C", "التركيز", { nonNegative: true });
  const c = truncate(raw, p.digits);
  const idx = p.rows.findIndex(([lo, hi]) => c >= lo && c <= hi);
  const cText = `${fmt(c)} ${p.unit}`;
  const table = {
    type: "table",
    caption: "فئات مؤشر جودة الهواء",
    head: ["الفئة", "نطاق المؤشر"],
    rows: CATS.map((cat) => [{ text: cat.name, color: cat.color, fg: cat.fg }, cat.range])
  };
  const steps = [`التركيز بعد القطع إلى ${p.digits} خانة عشرية: ${cText}`];
  const blocks = [table];
  if (key === "o3") blocks.push({ type: "note", text: "جدول الأوزون في هذه الأداة ينتهي عند 0.200 ppm لمتوسط 8 ساعات.", tone: "warn" });
  if (idx < 0) {
    const out = "خارج المقياس (أكثر من 500)";
    steps.push(`التركيز ${cText} أعلى من آخر حد في الجدول، لذلك لا يُحسب المؤشر.`);
    return {
      results: [
        { label: "مؤشر جودة الهواء AQI", value: out, text: out },
        { label: "الملوث", value: p.name },
        { label: "التركيز بعد القطع", value: cText }
      ],
      steps,
      copy: `${p.name} عند ${cText}: ${out}`,
      blocks,
      values: { I: null, category: null, c }
    };
  }
  const [clo, chi, ilo, ihi] = p.rows[idx];
  const cat = CATS[idx];
  const exact = (ihi - ilo) / (chi - clo) * (c - clo) + ilo;
  const I = Math.round(exact);
  steps.push({ text: "نطاق التركيز المناسب:", tex: `${ntex(clo)} \\le C_p \\le ${ntex(chi)}` });
  steps.push({ text: "الاستيفاء الخطي:", tex: `I = \\frac{${ntex(ihi)} - ${ntex(ilo)}}{${ntex(chi)} - ${ntex(clo)}}\\left(${ntex(c)} - ${ntex(clo)}\\right) + ${ntex(ilo)} = ${ntex(exact, 6)}` });
  steps.push({ text: "تقريب المؤشر إلى أقرب عدد صحيح:", tex: `AQI = ${I}` });
  return {
    results: [
      { label: "مؤشر جودة الهواء AQI", value: String(I), text: `AQI = ${I}` },
      { label: "الفئة الصحية", value: cat.name },
      { label: "الملوث", value: p.name },
      { label: "التركيز بعد القطع", value: cText }
    ],
    steps,
    copy: `AQI = ${I} (${cat.name}) لـ ${p.name} عند ${cText}`,
    blocks,
    values: { I, category: cat.name, c }
  };
}
