import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Herhangi bir konum, tarih ve saat için güneş yüksekliğini ve azimutunu, doğuş, öğle ve batış zamanlarını ile gün uzunluğunu; herhangi bir cismin gölge uzunluğunu ve yönünü hesaplayın. Binaların yönlendirilmesi ve güneş kırıcı tasarımı içindir.",
  keywords: ["güneş konumu", "güneş açısı", "güneş yüksekliği", "azimut", "azimuth", "sun angle", "gölge uzunluğu", "doğuş", "batış", "öğle", "solar position", "güneş kırıcılar", "binanın yönlendirilmesi"],
  formulas: [
    { label: "Yükseklik açısı", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "gölge uzunluğu", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "Enlem φ", unit: "°", type: "number", default: "24.71", help: "Kuzey pozitif, güney negatif. Örneğin Riyad 24.71, Kahire 30.04, Gazze 31.5." },
    { id: "lon", label: "Boylam", unit: "°", type: "number", default: "46.68", help: "Doğu pozitif, batı negatif." },
    { id: "date", label: "Tarih", type: "text", default: "2026-06-21", help: "YYYY-AA-GG biçiminde." },
    { id: "time", label: "Yerel saat", type: "text", default: "15:00", help: "SS:DD biçiminde (24 saat sistemi)." },
    { id: "tz", label: "UTC'den saat farkı", unit: "h", type: "number", default: "3", help: "Riyad +3, Kahire +2 veya yazın +3, Londra 0 veya yazın +1." },
    { id: "height", label: "Cismin yüksekliği (gölge hesabı için)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["Doğuş 04:43", "Batış 21:21"], note: "Örnek: yaz gündönümünde Londra." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"];
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
  const lat = num(input, "lat", "Enlem", { min: -90, max: 90 });
  const lon = num(input, "lon", "Boylam", { min: -180, max: 180 });
  const tz = num(input, "tz", "Saat farkı", { min: -12, max: 14 });
  const H = num(input, "height", "Cismin yüksekliği", { positive: true });
  const ds = str(input, "date", "Tarih").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("Tarihi YYYY-AA-GG biçiminde yazın, örneğin 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("Bu tarih takvimde yok.", "date");
  const tm = str(input, "time", "Saat").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("Saati SS:DD biçiminde yazın, örneğin 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "Güneşin ufuk üzerindeki yüksekliği", value: `${fmt(s.elev, 4)}°` },
    { label: "Azimut (kuzeyden saat yönünde)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "Doğuş ve batış", value: "Bu gün güneş doğmaz (kutup gecesi)" }); sunText = "kutup gecesi"; }
  else if (cosH0 < -1) { results.push({ label: "Doğuş ve batış", value: "Bu gün güneş batmaz (kutup gündüzü)" }); sunText = "kutup gündüzü"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "Doğuş / öğle / batış", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "Gün uzunluğu", value: `${Math.floor((8 * H0) / 60)} saat ve ${Math.round((8 * H0) % 60)} dakika` });
    sunText = `Doğuş ${hm(rise)}, öğle ${hm(noon)}, batış ${hm(set)}`;
  }
  results.push({ label: "En büyük yükseklik (öğlede)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "Güneş ufkun altında olduğundan gölge yok.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m, yön ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `Yüksekliği ${fmt(H)} m olan cismin gölge uzunluğu`, value: shadow });
  } else results.push({ label: "Gölge", value: shadow });
  results.push({ label: "Güneş sapması δ / zaman denklemi", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} dakika` });
  const steps = [
    `Yılın ${doy}. günü. Yıllık açıyı, güneş sapmasını δ ve zaman denklemini hesaplıyoruz (NOAA yaklaşımı).`,
    { text: "Güneş sapması ve zaman denklemi:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "Gerçek güneş zamanı ve saat açısı:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "Yükseklik açısı:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "Doğuş ve batış, güneş merkezi ufkun 0.833° altında olduğunda hesaplanır (kırılma ve disk yarıçapı düzeltmesi).",
    s.elev > 0.5 ? { text: "Gölge uzunluğu:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "Güneş ufkun altında veya ona çok yakın olduğundan gölge hesaplanmadı."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "Gün içinde güneş yüksekliği (yerel saatle)", xLabel: "Saat", yLabel: "Yükseklik (°)", xMin: 0, xMax: 24, series: [{ name: "Yükseklik", points: curve }, { name: "Şimdi", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "Hesaplama, zamanlar için bir ila iki dakika, açılar için derecenin kesirleri hassasiyetindedir. Resmi namaz vakitleri için kullanılmaz." }
    ],
    copy: `Güneş yüksekliği ${fmt(s.elev, 4)}°, azimut ${fmt(s.az, 4)}°, ${sunText}`
  };
}
