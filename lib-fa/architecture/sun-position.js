import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه ارتفاع خورشید و زاویه سمت آن برای هر موقعیت، تاریخ و زمان، همراه با زمان طلوع و ظهر و غروب و طول روز، و طول و جهت سایه هر جسم، برای جهت‌گیری ساختمان و طراحی کرکره‌ها و سایه‌بان‌های خورشیدی.",
  keywords: ["موقعیت خورشید", "زاویه خورشید", "ارتفاع خورشید", "سمت", "azimuth", "sun angle", "طول سایه", "طلوع", "غروب", "ظهر", "solar position", "سایه‌بان خورشیدی", "جهت‌گیری ساختمان"],
  formulas: [
    { label: "زاویه ارتفاع", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "طول سایه", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "عرض جغرافیایی φ", unit: "°", type: "number", default: "24.71", help: "شمالی مثبت و جنوبی منفی است. مثلاً ریاض 24.71، قاهره 30.04، غزه 31.5." },
    { id: "lon", label: "طول جغرافیایی", unit: "°", type: "number", default: "46.68", help: "شرقی مثبت و غربی منفی است." },
    { id: "date", label: "تاریخ", type: "text", default: "2026-06-21", help: "به صورت YYYY-MM-DD." },
    { id: "time", label: "زمان محلی", type: "text", default: "15:00", help: "به صورت HH:MM (ساعت 24 ساعته)." },
    { id: "tz", label: "اختلاف زمان با UTC", unit: "h", type: "number", default: "3", help: "ریاض +3، قاهره +2 یا در تابستان +3، لندن 0 یا در تابستان +1." },
    { id: "height", label: "ارتفاع جسم (برای محاسبه سایه)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["طلوع 04:43", "غروب 21:21"], note: "مثال: لندن در انقلاب تابستانی." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["شمال", "شمال‌شرقی", "شرق", "جنوب‌شرقی", "جنوب", "جنوب‌غربی", "غرب", "شمال‌غربی"];
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
  const lat = num(input, "lat", "عرض جغرافیایی", { min: -90, max: 90 });
  const lon = num(input, "lon", "طول جغرافیایی", { min: -180, max: 180 });
  const tz = num(input, "tz", "اختلاف زمان", { min: -12, max: 14 });
  const H = num(input, "height", "ارتفاع جسم", { positive: true });
  const ds = str(input, "date", "تاریخ").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("تاریخ را به صورت YYYY-MM-DD مانند 2026-06-21 بنویسید.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("این تاریخ در تقویم وجود ندارد.", "date");
  const tm = str(input, "time", "زمان").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("زمان را به صورت HH:MM مانند 14:30 بنویسید.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "ارتفاع خورشید از افق", value: `${fmt(s.elev, 4)}°` },
    { label: "سمت (از شمال در جهت عقربه‌های ساعت)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "طلوع و غروب", value: "در این روز خورشید طلوع نمی‌کند (شب قطبی)" }); sunText = "شب قطبی"; }
  else if (cosH0 < -1) { results.push({ label: "طلوع و غروب", value: "در این روز خورشید غروب نمی‌کند (روز قطبی)" }); sunText = "روز قطبی"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "طلوع / ظهر / غروب", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "طول روز", value: `${Math.floor((8 * H0) / 60)} ساعت و ${Math.round((8 * H0) % 60)} دقیقه` });
    sunText = `طلوع ${hm(rise)}، ظهر ${hm(noon)}، غروب ${hm(set)}`;
  }
  results.push({ label: "بیشترین ارتفاع (در ظهر)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "خورشید زیر افق است، پس سایه‌ای وجود ندارد.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m به سمت ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `طول سایه جسمی به ارتفاع ${fmt(H)} m`, value: shadow });
  } else results.push({ label: "سایه", value: shadow });
  results.push({ label: "میل خورشیدی δ / معادله زمان", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} دقیقه` });
  const steps = [
    `روز شماره ${doy} از سال. ابتدا زاویه سالانه را محاسبه می‌کنیم، سپس میل خورشیدی δ و معادله زمان را (تقریب NOAA).`,
    { text: "میل خورشیدی و معادله زمان:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "زمان خورشیدی واقعی و زاویه ساعتی:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "زاویه ارتفاع:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "طلوع و غروب زمانی رخ می‌دهد که مرکز خورشید 0.833° زیر افق باشد (تصحیح شکست نور و شعاع قرص).",
    s.elev > 0.5 ? { text: "طول سایه:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "خورشید زیر افق یا بسیار نزدیک به آن است، پس سایه محاسبه نمی‌شود."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "ارتفاع خورشید در طول روز (به زمان محلی)", xLabel: "ساعت", yLabel: "ارتفاع (°)", xMin: 0, xMax: 24, series: [{ name: "ارتفاع", points: curve }, { name: "اکنون", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "دقت محاسبه در حد یک یا دو دقیقه برای زمان‌ها و کسری از درجه برای زاویه‌هاست. برای تعیین اوقات شرعی نماز به کار نمی‌رود." }
    ],
    copy: `ارتفاع خورشید ${fmt(s.elev, 4)}°، سمت ${fmt(s.az, 4)}°، ${sunText}`
  };
}
