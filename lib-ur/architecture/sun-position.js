import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "کسی بھی مقام، تاریخ اور وقت کے لیے سورج کی بلندی اور سمتی زاویہ، طلوع، زوال اور غروب کے اوقات اور دن کی لمبائی، اور کسی بھی جسم کے سائے کی لمبائی اور سمت حساب کریں، عمارت کی سمت اور سورج سے بچاؤ کے ڈیزائن کے لیے۔",
  keywords: ["سورج کی پوزیشن", "سورج کا زاویہ", "سورج کی بلندی", "سمتی زاویہ (ایزیمتھ)", "azimuth", "sun angle", "سائے کی لمبائی", "طلوع", "غروب", "زوال", "solar position", "سورج سے بچاؤ", "عمارت کی سمت"],
  formulas: [
    { label: "بلندی کا زاویہ", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "سائے کی لمبائی", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "عرض البلد φ", unit: "°", type: "number", default: "24.71", help: "شمال میں مثبت اور جنوب میں منفی۔ مثلاً ریاض 24.71، قاہرہ 30.04، غزہ 31.5۔" },
    { id: "lon", label: "طول البلد", unit: "°", type: "number", default: "46.68", help: "مشرق میں مثبت اور مغرب میں منفی۔" },
    { id: "date", label: "تاریخ", type: "text", default: "2026-06-21", help: "YYYY-MM-DD فارمیٹ میں۔" },
    { id: "time", label: "مقامی وقت", type: "text", default: "15:00", help: "HH:MM فارمیٹ میں (24 گھنٹے کا نظام)۔" },
    { id: "tz", label: "UTC سے ٹائم زون کا فرق", unit: "h", type: "number", default: "3", help: "ریاض +3، قاہرہ +2 یا گرمیوں میں +3، لندن 0 یا گرمیوں میں +1۔" },
    { id: "height", label: "جسم کی اونچائی (سائے کے حساب کے لیے)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["طلوع 04:43", "غروب 21:21"], note: "مثال: گرمیوں کے انقلاب (solstice) پر لندن۔" },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["شمال", "شمال مشرق", "مشرق", "جنوب مشرق", "جنوب", "جنوب مغرب", "مغرب", "شمال مغرب"];
const dirName = (az) => DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8];

function solar(doy, minutes, lat, lon, tz, leap) {
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (doy - 1 + (minutes / 60 - 12) / 24);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = minutes + eot + 4 * lon - 60 * tz;
  const ha = tst / 4 - 180;
  const phi = lat * D2R, h = ha * D2R;
  const cz = Math.min(1, Math.max(-1, Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h)));
  const zen = Math.acos(cz);
  let az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / D2R + 180;
  az = ((az % 360) + 360) % 360;
  return { eot, decl, ha, elev: 90 - zen / D2R, az };
}

export function solve(input) {
  const lat = num(input, "lat", "عرض البلد", { min: -90, max: 90 });
  const lon = num(input, "lon", "طول البلد", { min: -180, max: 180 });
  const tz = num(input, "tz", "ٹائم زون کا فرق", { min: -12, max: 14 });
  const H = num(input, "height", "جسم کی اونچائی", { positive: true });
  const ds = str(input, "date", "تاریخ").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("تاریخ YYYY-MM-DD فارمیٹ میں لکھیں، جیسے 2026-06-21۔", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("یہ تاریخ کیلنڈر میں موجود نہیں ہے۔", "date");
  const tm = str(input, "time", "وقت").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("وقت HH:MM فارمیٹ میں لکھیں، جیسے 14:30۔", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "افق سے سورج کی بلندی", value: `${fmt(s.elev, 4)}°` },
    { label: "سمتی زاویہ (شمال سے گھڑی کی سمت)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "طلوع اور غروب", value: "اس دن سورج طلوع نہیں ہوتا (قطبی رات)" }); sunText = "قطبی رات"; }
  else if (cosH0 < -1) { results.push({ label: "طلوع اور غروب", value: "اس دن سورج غروب نہیں ہوتا (قطبی دن)" }); sunText = "قطبی دن"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "طلوع / زوال / غروب", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "دن کی لمبائی", value: `${Math.floor((8 * H0) / 60)} گھنٹے اور ${Math.round((8 * H0) % 60)} منٹ` });
    sunText = `طلوع ${hm(rise)}، زوال ${hm(noon)}، غروب ${hm(set)}`;
  }
  results.push({ label: "زیادہ سے زیادہ بلندی (زوال کے وقت)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "سورج افق کے نیچے ہے، اس لیے کوئی سایہ نہیں۔";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m، سمت ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `${fmt(H)} m اونچائی والے جسم کے سائے کی لمبائی`, value: shadow });
  } else results.push({ label: "سایہ", value: shadow });
  results.push({ label: "سورج کا میلان δ / مساواتِ وقت", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} منٹ` });
  const steps = [
    `سال کا ${doy} واں دن۔ ہم سالانہ زاویہ، پھر سورج کا میلان δ اور مساواتِ وقت (NOAA تقریب) حساب کرتے ہیں۔`,
    { text: "سورج کا میلان اور مساواتِ وقت:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "حقیقی شمسی وقت اور ہاؤر اینگل:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "بلندی کا زاویہ:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "طلوع اور غروب اس وقت ہوتے ہیں جب سورج کا مرکز افق سے 0.833° نیچے ہو (ریفریکشن اور ڈسک کے رداس کی درستگی)۔",
    s.elev > 0.5 ? { text: "سائے کی لمبائی:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "سورج افق کے نیچے یا اس کے بہت قریب ہے، اس لیے سایہ نہیں نکالا جاتا۔"
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "دن کے دوران سورج کی بلندی (مقامی وقت)", xLabel: "گھنٹہ", yLabel: "بلندی (°)", xMin: 0, xMax: 24, series: [{ name: "بلندی", points: curve }, { name: "ابھی", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "حساب کی درستگی اوقات میں ایک یا دو منٹ کے اندر، اور زاویوں میں درجے کے کسر تک ہے۔ اسے شرعی نمازوں کے اوقات کے طور پر استعمال نہ کریں۔" }
    ],
    copy: `سورج کی بلندی ${fmt(s.elev, 4)}°، سمتی زاویہ ${fmt(s.az, 4)}°، ${sunText}`
  };
}
