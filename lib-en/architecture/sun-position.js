import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate the sun's elevation and azimuth for any location, date and time, plus sunrise, solar noon and sunset times and day length, and the length and direction of the shadow of any object, for building orientation and sun-shading design.",
  keywords: ["sun position", "sun angle", "sun elevation", "azimuth", "azimuth", "sun angle", "shadow length", "sunrise", "sunset", "solar noon", "solar position", "sun shading", "building orientation"],
  formulas: [
    { label: "elevation angle", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "shadow length", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "Latitude φ", unit: "°", type: "number", default: "24.71", help: "North is positive, south is negative. For example, Riyadh 24.71, Cairo 30.04, Gaza 31.5." },
    { id: "lon", label: "Longitude", unit: "°", type: "number", default: "46.68", help: "East is positive, west is negative." },
    { id: "date", label: "Date", type: "text", default: "2026-06-21", help: "In YYYY-MM-DD format." },
    { id: "time", label: "Local time", type: "text", default: "15:00", help: "In HH:MM format (24-hour clock)." },
    { id: "tz", label: "Time zone offset from UTC", unit: "h", type: "number", default: "3", help: "Riyadh +3, Cairo +2 or +3 in summer, London 0 or +1 in summer." },
    { id: "height", label: "Object height (for shadow calculation)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["Sunrise 04:43", "Sunset 21:21"], note: "Example: London at the summer solstice." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
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
  const lat = num(input, "lat", "Latitude", { min: -90, max: 90 });
  const lon = num(input, "lon", "Longitude", { min: -180, max: 180 });
  const tz = num(input, "tz", "Time zone offset", { min: -12, max: 14 });
  const H = num(input, "height", "Object height", { positive: true });
  const ds = str(input, "date", "Date").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("Enter the date in YYYY-MM-DD format, e.g. 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("This date does not exist in the calendar.", "date");
  const tm = str(input, "time", "Time").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("Enter the time in HH:MM format, e.g. 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "Sun elevation above the horizon", value: `${fmt(s.elev, 4)}°` },
    { label: "Azimuth (clockwise from north)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "Sunrise and sunset", value: "The sun does not rise on this day (polar night)" }); sunText = "polar night"; }
  else if (cosH0 < -1) { results.push({ label: "Sunrise and sunset", value: "The sun does not set on this day (polar day)" }); sunText = "polar day"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "Sunrise / Solar noon / Sunset", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "Day length", value: `${Math.floor((8 * H0) / 60)} h ${Math.round((8 * H0) % 60)} min` });
    sunText = `Sunrise ${hm(rise)}, solar noon ${hm(noon)}, sunset ${hm(set)}`;
  }
  results.push({ label: "Maximum elevation (at solar noon)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "The sun is below the horizon, so there is no shadow.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m toward ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `Shadow length of an object ${fmt(H)} m tall`, value: shadow });
  } else results.push({ label: "Shadow", value: shadow });
  results.push({ label: "Solar declination δ / equation of time", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} min` });
  const steps = [
    `Day ${doy} of the year. We compute the annual angle, then the solar declination δ and the equation of time (NOAA approximation).`,
    { text: "Solar declination and equation of time:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "True solar time and hour angle:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "Elevation angle:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "Sunrise and sunset occur when the sun's center is 0.833° below the horizon (correcting for refraction and the disk radius).",
    s.elev > 0.5 ? { text: "Shadow length:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "The sun is below the horizon or very close to it, so the shadow is not calculated."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "Sun elevation through the day (local time)", xLabel: "Hour", yLabel: "Elevation (°)", xMin: 0, xMax: 24, series: [{ name: "Elevation", points: curve }, { name: "Now", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "Calculation accuracy is within one or two minutes for times and a fraction of a degree for angles. Not for use as religious prayer times." }
    ],
    copy: `Sun elevation ${fmt(s.elev, 4)}°, azimuth ${fmt(s.az, 4)}°, ${sunText}`
  };
}
