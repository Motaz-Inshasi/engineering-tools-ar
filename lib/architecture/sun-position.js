import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب ارتفاع الشمس وزاوية سمتها لأي موقع وتاريخ ووقت، وأوقات الشروق والزوال والغروب وطول النهار، وطول الظل واتجاهه لأي جسم، لتوجيه المباني وتصميم كاسرات الشمس.",
  keywords: ["موقع الشمس", "زاوية الشمس", "ارتفاع الشمس", "السمت", "azimuth", "sun angle", "طول الظل", "الشروق", "الغروب", "الزوال", "solar position", "كاسرات الشمس", "توجيه المبنى"],
  formulas: [
    { label: "زاوية الارتفاع", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "طول الظل", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "خط العرض φ", unit: "°", type: "number", default: "24.71", help: "شمالاً موجب وجنوباً سالب. مثلاً الرياض 24.71، القاهرة 30.04، غزة 31.5." },
    { id: "lon", label: "خط الطول", unit: "°", type: "number", default: "46.68", help: "شرقاً موجب وغرباً سالب." },
    { id: "date", label: "التاريخ", type: "text", default: "2026-06-21", help: "بالصيغة YYYY-MM-DD." },
    { id: "time", label: "الوقت المحلي", type: "text", default: "15:00", help: "بالصيغة HH:MM (نظام 24 ساعة)." },
    { id: "tz", label: "فرق التوقيت عن UTC", unit: "h", type: "number", default: "3", help: "الرياض +3، القاهرة +2 أو +3 صيفاً، لندن 0 أو +1 صيفاً." },
    { id: "height", label: "ارتفاع الجسم (لحساب الظل)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["الشروق 04:43", "الغروب 21:21"], note: "مثال: لندن في الانقلاب الصيفي." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["الشمال", "الشمال الشرقي", "الشرق", "الجنوب الشرقي", "الجنوب", "الجنوب الغربي", "الغرب", "الشمال الغربي"];
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
  const lat = num(input, "lat", "خط العرض", { min: -90, max: 90 });
  const lon = num(input, "lon", "خط الطول", { min: -180, max: 180 });
  const tz = num(input, "tz", "فرق التوقيت", { min: -12, max: 14 });
  const H = num(input, "height", "ارتفاع الجسم", { positive: true });
  const ds = str(input, "date", "التاريخ").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("اكتب التاريخ بالصيغة YYYY-MM-DD مثل 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("هذا التاريخ غير موجود في التقويم.", "date");
  const tm = str(input, "time", "الوقت").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("اكتب الوقت بالصيغة HH:MM مثل 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "ارتفاع الشمس عن الأفق", value: `${fmt(s.elev, 4)}°` },
    { label: "السمت (من الشمال باتجاه عقارب الساعة)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "الشروق والغروب", value: "الشمس لا تشرق في هذا اليوم (ليل قطبي)" }); sunText = "ليل قطبي"; }
  else if (cosH0 < -1) { results.push({ label: "الشروق والغروب", value: "الشمس لا تغرب في هذا اليوم (نهار قطبي)" }); sunText = "نهار قطبي"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "الشروق / الزوال / الغروب", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "طول النهار", value: `${Math.floor((8 * H0) / 60)} ساعة و ${Math.round((8 * H0) % 60)} دقيقة` });
    sunText = `الشروق ${hm(rise)}، الزوال ${hm(noon)}، الغروب ${hm(set)}`;
  }
  results.push({ label: "أقصى ارتفاع (عند الزوال)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "الشمس تحت الأفق فلا يوجد ظل.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m باتجاه ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `طول ظل جسم ارتفاعه ${fmt(H)} m`, value: shadow });
  } else results.push({ label: "الظل", value: shadow });
  results.push({ label: "الميل الشمسي δ / معادلة الزمن", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} دقيقة` });
  const steps = [
    `اليوم رقم ${doy} من السنة. نحسب الزاوية السنوية ثم ميل الشمس δ ومعادلة الزمن (تقريب NOAA).`,
    { text: "الميل الشمسي ومعادلة الزمن:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "الزمن الشمسي الحقيقي وزاوية الساعة:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "زاوية الارتفاع:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "الشروق والغروب عندما يكون مركز الشمس 0.833° تحت الأفق (تصحيح الانكسار ونصف قطر القرص).",
    s.elev > 0.5 ? { text: "طول الظل:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "الشمس تحت الأفق أو قريبة جداً منه، فلا نحسب الظل."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "ارتفاع الشمس خلال اليوم (بالتوقيت المحلي)", xLabel: "الساعة", yLabel: "الارتفاع (°)", xMin: 0, xMax: 24, series: [{ name: "الارتفاع", points: curve }, { name: "الآن", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "دقة الحساب في حدود دقيقة أو دقيقتين للأوقات، وأجزاء من الدرجة للزوايا. لا يُستخدم لمواقيت الصلاة الشرعية." }
    ],
    copy: `ارتفاع الشمس ${fmt(s.elev, 4)}°، السمت ${fmt(s.az, 4)}°، ${sunText}`
  };
}
