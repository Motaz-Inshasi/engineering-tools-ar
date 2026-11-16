import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule la altura del sol y su azimut para cualquier lugar, fecha y hora, además de las horas de salida, mediodía solar y puesta del sol, la duración del día, y la longitud y dirección de la sombra de cualquier objeto, para orientar edificios y diseñar parasoles.",
  keywords: ["posición del sol", "ángulo solar", "altura del sol", "azimut", "azimuth", "sun angle", "longitud de la sombra", "salida del sol", "puesta del sol", "mediodía solar", "solar position", "parasoles", "orientación del edificio"],
  formulas: [
    { label: "ángulo de elevación", tex: "\\sin\\alpha = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos h" },
    { label: "longitud de la sombra", tex: "L = \\frac{H}{\\tan\\alpha}" }
  ],
  inputs: [
    { id: "lat", label: "Latitud φ", unit: "°", type: "number", default: "24.71", help: "Norte es positivo y sur es negativo. Por ejemplo, Riad 24.71, El Cairo 30.04, Gaza 31.5." },
    { id: "lon", label: "Longitud", unit: "°", type: "number", default: "46.68", help: "Este es positivo y oeste es negativo." },
    { id: "date", label: "Fecha", type: "text", default: "2026-06-21", help: "Con el formato AAAA-MM-DD." },
    { id: "time", label: "Hora local", type: "text", default: "15:00", help: "Con el formato HH:MM (sistema de 24 horas)." },
    { id: "tz", label: "Diferencia horaria respecto a UTC", unit: "h", type: "number", default: "3", help: "Riad +3, El Cairo +2 o +3 en verano, Londres 0 o +1 en verano." },
    { id: "height", label: "Altura del objeto (para calcular la sombra)", unit: "m", type: "number", default: "10" }
  ],
  example: { values: { lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1", height: "10" }, expect: ["Salida 04:43", "Puesta 21:21"], note: "Ejemplo: Londres en el solsticio de verano." },
  invalid: { values: { lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "1" } },
  related: ["stair-design", "far-coverage", "polygon-area", "trigonometry"]
};

const D2R = Math.PI / 180;
const hm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const DIRS = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
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
  const lat = num(input, "lat", "Latitud", { min: -90, max: 90 });
  const lon = num(input, "lon", "Longitud", { min: -180, max: 180 });
  const tz = num(input, "tz", "Diferencia horaria", { min: -12, max: 14 });
  const H = num(input, "height", "Altura del objeto", { positive: true });
  const ds = str(input, "date", "Fecha").trim();
  const dm = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dm) fail("Escriba la fecha con el formato AAAA-MM-DD, por ejemplo 2026-06-21.", "date");
  const [Y, M, Dd] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const dt = new Date(Date.UTC(Y, M - 1, Dd));
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== Dd) fail("Esta fecha no existe en el calendario.", "date");
  const tm = str(input, "time", "Hora").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) fail("Escriba la hora con el formato HH:MM, por ejemplo 14:30.", "time");
  const minutes = Number(tm[1]) * 60 + Number(tm[2]);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((dt - Date.UTC(Y, 0, 1)) / 86400000) + 1;
  const s = solar(doy, minutes, lat, lon, tz, leap);
  const noonS = solar(doy, 720, lat, lon, tz, leap);
  const noon = 720 - 4 * lon - noonS.eot + 60 * tz;
  const phi = lat * D2R;
  const cosH0 = (Math.cos(90.833 * D2R) - Math.sin(phi) * Math.sin(noonS.decl)) / (Math.cos(phi) * Math.cos(noonS.decl));
  const results = [
    { label: "Altura del sol sobre el horizonte", value: `${fmt(s.elev, 4)}°` },
    { label: "Azimut (desde el norte en sentido horario)", value: `${fmt(s.az, 4)}° (${dirName(s.az)})` }
  ];
  let sunText = "";
  if (cosH0 > 1) { results.push({ label: "Salida y puesta del sol", value: "El sol no sale este día (noche polar)" }); sunText = "noche polar"; }
  else if (cosH0 < -1) { results.push({ label: "Salida y puesta del sol", value: "El sol no se pone este día (día polar)" }); sunText = "día polar"; }
  else {
    const H0 = Math.acos(cosH0) / D2R;
    const rise = noon - 4 * H0, set = noon + 4 * H0;
    results.push({ label: "Salida / Mediodía solar / Puesta", value: `${hm(rise)} / ${hm(noon)} / ${hm(set)}` }, { label: "Duración del día", value: `${Math.floor((8 * H0) / 60)} h ${Math.round((8 * H0) % 60)} min` });
    sunText = `Salida ${hm(rise)}, mediodía solar ${hm(noon)}, puesta ${hm(set)}`;
  }
  results.push({ label: "Altura máxima (al mediodía solar)", value: `${fmt(90 - Math.abs(lat - noonS.decl / D2R), 4)}°` });
  let shadow = "El sol está bajo el horizonte, así que no hay sombra.";
  if (s.elev > 0.5) {
    const L = H / Math.tan(s.elev * D2R);
    shadow = `${fmt(L, 4)} m hacia ${dirName(s.az + 180)} (${fmt((s.az + 180) % 360, 4)}°)`;
    results.push({ label: `Longitud de la sombra de un objeto de ${fmt(H)} m de altura`, value: shadow });
  } else results.push({ label: "Sombra", value: shadow });
  results.push({ label: "Declinación solar δ / ecuación del tiempo", value: `${fmt(s.decl / D2R, 4)}° / ${fmt(s.eot, 3)} min` });
  const steps = [
    `Día número ${doy} del año. Calculamos el ángulo anual, luego la declinación solar δ y la ecuación del tiempo (aproximación NOAA).`,
    { text: "Declinación solar y ecuación del tiempo:", tex: `\\delta = ${ntex(s.decl / D2R, 5)}^{\\circ},\\quad EoT = ${ntex(s.eot, 4)}\\ \\text{min}` },
    { text: "Tiempo solar verdadero y ángulo horario:", tex: `TST = ${minutes} + ${ntex(s.eot, 4)} + 4(${ntex(lon)}) - 60(${ntex(tz)}) = ${ntex(minutes + s.eot + 4 * lon - 60 * tz, 5)}\\ \\text{min},\\quad h = \\frac{TST}{4} - 180 = ${ntex(s.ha, 5)}^{\\circ}` },
    { text: "Ángulo de elevación:", tex: `\\sin\\alpha = \\sin(${ntex(lat)}^{\\circ})\\sin(${ntex(s.decl / D2R, 4)}^{\\circ}) + \\cos(${ntex(lat)}^{\\circ})\\cos(${ntex(s.decl / D2R, 4)}^{\\circ})\\cos(${ntex(s.ha, 4)}^{\\circ}) \\Rightarrow \\alpha = ${ntex(s.elev, 4)}^{\\circ}` },
    "La salida y la puesta ocurren cuando el centro del sol está 0.833° bajo el horizonte (corrigiendo la refracción y el radio del disco).",
    s.elev > 0.5 ? { text: "Longitud de la sombra:", tex: `L = \\frac{${ntex(H)}}{\\tan(${ntex(s.elev, 4)}^{\\circ})} = ${ntex(H / Math.tan(s.elev * D2R), 4)}\\ m` } : "El sol está bajo el horizonte o muy cerca de él, así que no se calcula la sombra."
  ];
  const curve = [];
  for (let m = 0; m <= 1440; m += 10) { const p = solar(doy, m, lat, lon, tz, leap); curve.push([m / 60, p.elev]); }
  return {
    results, steps,
    blocks: [
      { type: "plot", title: "Altura del sol durante el día (hora local)", xLabel: "Hora", yLabel: "Altura (°)", xMin: 0, xMax: 24, series: [{ name: "Altura", points: curve }, { name: "Ahora", points: [[minutes / 60, s.elev]], marker: "o" }], hlines: [{ y: 0 }] },
      { type: "note", text: "La precisión del cálculo es de uno o dos minutos para las horas, y de fracciones de grado para los ángulos. No se usa para horarios de oración religiosos." }
    ],
    copy: `Altura del sol ${fmt(s.elev, 4)}°, azimut ${fmt(s.az, 4)}°, ${sunText}`
  };
}
