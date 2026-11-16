import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Hitung ketinggian dan azimut matahari untuk lokasi, tanggal, dan waktu apa pun, serta waktu terbit, tengah hari surya, dan terbenam, panjang siang hari, dan panjang serta arah bayangan benda apa pun, untuk orientasi bangunan dan desain peneduh matahari.",
  keywords: ["posisi matahari", "sudut matahari", "ketinggian matahari", "azimut", "azimuth", "sun angle", "panjang bayangan", "terbit", "terbenam", "tengah hari surya", "solar position", "peneduh matahari", "orientasi bangunan"],
  formulas: [
    { label: "Sudut ketinggian", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "panjang bayangan", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "Lintang φ", unit: "°", type: "number", default: "24.71", help: "Lintang utara positif dan lintang selatan negatif. Misalnya Riyadh 24.71, Kairo 30.04, Gaza 31.5." },
    { id: "lon", label: "Bujur", unit: "°", type: "number", default: "46.68", help: "Bujur timur positif dan bujur barat negatif." },
    { id: "date", label: "Tanggal", type: "text", default: "2026-06-21", help: "Dalam format YYYY-MM-DD." },
    { id: "time", label: "Waktu lokal", type: "text", default: "15:00", help: "Dalam format HH:MM (format 24 jam)." },
    { id: "tz", label: "Selisih zona waktu terhadap UTC", unit: "h", type: "number", default: "3", help: "Riyadh +3, Kairo +2 atau +3 saat musim panas, London 0 atau +1 saat musim panas." },
    { id: "height", label: "Tinggi benda (untuk menghitung bayangan)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["Terbit 04:43", "Terbenam 21:21"], note: "Contoh: London pada titik balik matahari musim panas." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["Utara", "Timur laut", "Timur", "Tenggara", "Selatan", "Barat daya", "Barat", "Barat laut"];
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
  const lat = num(input, "lat", "Lintang", { min: -90, max: 90 });
  const lon = num(input, "lon", "Bujur", { min: -180, max: 180 });
  const tz = num(input, "tz", "Selisih zona waktu", { min: -12, max: 14 });
  const H = num(input, "height", "Tinggi benda", { positive: true });
  const ds = str(input, "date", "Tanggal").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("Tulis tanggal dalam format YYYY-MM-DD, misalnya 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("Tanggal ini tidak ada dalam kalender.", "date");
  const tm = str(input, "time", "Waktu").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("Tulis waktu dalam format HH:MM, misalnya 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "Ketinggian matahari di atas cakrawala", value: `${fmt(s.elev, 4)}°` },
    { label: "Azimut (searah jarum jam dari utara)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "Terbit dan terbenam", value: "Matahari tidak terbit pada hari ini (malam kutub)" }); sunText = "malam kutub"; }
  else if (cosH0 < -1) { results.push({ label: "Terbit dan terbenam", value: "Matahari tidak terbenam pada hari ini (siang kutub)" }); sunText = "siang kutub"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "Terbit / tengah hari surya / terbenam", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "Panjang siang hari", value: `${Math.floor((8 * H0) / 60)} jam dan ${Math.round((8 * H0) % 60)} menit` });
    sunText = `Terbit ${hm(rise)}, tengah hari surya ${hm(noon)}, terbenam ${hm(set)}`;
  }
  results.push({ label: "Ketinggian maksimum (pada tengah hari surya)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "Matahari di bawah cakrawala sehingga tidak ada bayangan.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m ke arah ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `Panjang bayangan benda setinggi ${fmt(H)} m`, value: shadow });
  } else results.push({ label: "Bayangan", value: shadow });
  results.push({ label: "Deklinasi matahari δ / persamaan waktu", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} menit` });
  const steps = [
    `Hari ke-${doy} dalam tahun. Kita hitung sudut tahunan, lalu deklinasi matahari δ dan persamaan waktu (pendekatan NOAA).`,
    { text: "Deklinasi matahari dan persamaan waktu:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "Waktu surya sebenarnya dan sudut jam:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "Sudut ketinggian:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "Terbit dan terbenam terjadi ketika pusat matahari berada 0.833° di bawah cakrawala (koreksi refraksi dan jari-jari piringan).",
    s.elev > 0.5 ? { text: "Panjang bayangan:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "Matahari berada di bawah atau sangat dekat dengan cakrawala, sehingga bayangan tidak dihitung."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "Ketinggian matahari sepanjang hari (waktu lokal)", xLabel: "Jam", yLabel: "Ketinggian (°)", xMin: 0, xMax: 24, series: [{ name: "Ketinggian", points: curve }, { name: "Sekarang", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "Akurasi perhitungan dalam kisaran satu atau dua menit untuk waktu, dan pecahan derajat untuk sudut. Tidak digunakan sebagai waktu salat syar'i." }
    ],
    copy: `Ketinggian matahari ${fmt(s.elev, 4)}°, azimut ${fmt(s.az, 4)}°, ${sunText}`
  };
}
