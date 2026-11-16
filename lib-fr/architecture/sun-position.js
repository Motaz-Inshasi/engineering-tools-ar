import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez la hauteur du soleil et son azimut pour un lieu, une date et une heure donnés, ainsi que les heures du lever, du passage au méridien et du coucher, la durée du jour, et la longueur et la direction de l'ombre portée d'un objet, afin d'orienter les bâtiments et de concevoir les brise-soleil.",
  keywords: ["position du soleil", "angle du soleil", "hauteur du soleil", "azimut", "azimuth", "sun angle", "longueur de l'ombre", "lever du soleil", "coucher du soleil", "passage au méridien", "solar position", "brise-soleil", "orientation du bâtiment"],
  formulas: [
    { label: "Angle de hauteur", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "longueur de l'ombre", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "Latitude φ", unit: "°", type: "number", default: "24.71", help: "Positive au nord, négative au sud. Par exemple Riyad 24.71, Le Caire 30.04, Gaza 31.5." },
    { id: "lon", label: "Longitude", unit: "°", type: "number", default: "46.68", help: "Positive à l'est, négative à l'ouest." },
    { id: "date", label: "Date", type: "text", default: "2026-06-21", help: "Au format YYYY-MM-DD." },
    { id: "time", label: "Heure locale", type: "text", default: "15:00", help: "Au format HH:MM (24 heures)." },
    { id: "tz", label: "Décalage horaire par rapport à UTC", unit: "h", type: "number", default: "3", help: "Riyad +3, Le Caire +2 ou +3 en été, Londres 0 ou +1 en été." },
    { id: "height", label: "Hauteur de l'objet (pour le calcul de l'ombre)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["Lever 04:43", "Coucher 21:21"], note: "Exemple : Londres au solstice d'été." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"];
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
  const lat = num(input, "lat", "latitude", { min: -90, max: 90 });
  const lon = num(input, "lon", "Longitude", { min: -180, max: 180 });
  const tz = num(input, "tz", "décalage horaire", { min: -12, max: 14 });
  const H = num(input, "height", "hauteur de l'objet", { positive: true });
  const ds = str(input, "date", "Date").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("Saisissez la date au format YYYY-MM-DD, par exemple 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("Cette date n'existe pas dans le calendrier.", "date");
  const tm = str(input, "time", "l'heure").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("Saisissez l'heure au format HH:MM, par exemple 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "Hauteur du soleil au-dessus de l'horizon", value: `${fmt(s.elev, 4)}°` },
    { label: "Azimut (depuis le nord, dans le sens des aiguilles d'une montre)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "Lever et coucher", value: "Le soleil ne se lève pas ce jour-là (nuit polaire)" }); sunText = "nuit polaire"; }
  else if (cosH0 < -1) { results.push({ label: "Lever et coucher", value: "Le soleil ne se couche pas ce jour-là (jour polaire)" }); sunText = "jour polaire"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "Lever / passage au méridien / coucher", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "Durée du jour", value: `${Math.floor((8 * H0) / 60)} h et ${Math.round((8 * H0) % 60)} min` });
    sunText = `Lever ${hm(rise)}, passage au méridien ${hm(noon)}, coucher ${hm(set)}`;
  }
  results.push({ label: "Hauteur maximale (au passage au méridien)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "Le soleil est sous l'horizon, il n'y a donc pas d'ombre.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m vers ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `Longueur de l'ombre d'un objet de ${fmt(H)} m de hauteur`, value: shadow });
  } else results.push({ label: "Ombre", value: shadow });
  results.push({ label: "Déclinaison solaire δ / équation du temps", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} min` });
  const steps = [
    `Jour n° ${doy} de l'année. Nous calculons l'angle annuel, puis la déclinaison du soleil δ et l'équation du temps (approximation NOAA).`,
    { text: "Déclinaison solaire et équation du temps :", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "Temps solaire vrai et angle horaire :", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "Angle de hauteur :", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "Le lever et le coucher sont calculés lorsque le centre du soleil est à 0.833° sous l'horizon (correction de la réfraction et rayon du disque).",
    s.elev > 0.5 ? { text: "Longueur de l'ombre :", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "Le soleil est sous l'horizon ou très proche de celui-ci, donc l'ombre n'est pas calculée."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "Hauteur du soleil au cours de la journée (heure locale)", xLabel: "Heure", yLabel: "Hauteur (°)", xMin: 0, xMax: 24, series: [{ name: "Hauteur", points: curve }, { name: "Maintenant", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "La précision du calcul est de l'ordre d'une à deux minutes pour les heures, et de fractions de degré pour les angles. Il ne doit pas être utilisé pour calculer les horaires religieux de prière." }
    ],
    copy: `Hauteur du soleil ${fmt(s.elev, 4)}°, azimut ${fmt(s.az, 4)}°, ${sunText}`
  };
}
