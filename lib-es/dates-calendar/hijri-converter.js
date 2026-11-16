import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { toHijri, fromHijri, hijriMonthLength, parseGregorian, iso, gLong, hLong, H_MONTHS, H_MIN, H_MAX, DAY } from "./calendar.js";

export const meta = {
  description: "Convierta fechas del calendario gregoriano al hiyrí y viceversa según el calendario Umm al-Qura, con el día de la semana, el número de días del mes hiyrí y una tabla con todos los días del mes.",
  keywords: ["Conversión de fechas", "hiyrí", "gregoriano", "calendario hiyrí", "Umm al-Qura", "hijri", "islamic calendar", "fecha de hoy en hiyrí", "Ramadán", "conversión hiyrí-gregoriano"],
  formulas: [{ label: "Duración aproximada del año hiyrí y del mes lunar", tex: "\\bar{Y}_H \\approx 354.367\\ \\text{días},\\qquad \\bar{M} \\approx 29.5306\\ \\text{días}" }],
  inputs: [
    { id: "dir", label: "Dirección", type: "select", default: "g2h", options: [["g2h", "Del gregoriano al hiyrí"], ["h2g", "Del hiyrí al gregoriano"]] },
    { id: "gdate", label: "Fecha gregoriana", type: "text", default: "2026-03-20", help: "Con el formato YYYY-MM-DD o DD/MM/YYYY.", when: { dir: ["g2h"] } },
    { id: "hy", label: "Año hiyrí", type: "number", default: "1447", when: { dir: ["h2g"] } },
    { id: "hm", label: "Mes hiyrí", type: "select", default: "9", options: H_MONTHS.map((n, i) => [String(i + 1), `${i + 1} - ${n}`]), when: { dir: ["h2g"] } },
    { id: "hd", label: "Día", type: "number", default: "1", when: { dir: ["h2g"] } }
  ],
  example: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "1" }, expect: ["1 de Ramadán de 1447 AH = miércoles 18 de febrero de 2026 d. C."], note: "Ejemplo: ¿cuándo empieza el Ramadán de 1447 AH según el calendario Umm al-Qura?" },
  invalid: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "31" } },
  related: ["date-difference", "age-calculator", "study-planner", "zakat"]
};

export function solve(input) {
  const dir = choice(input, "dir", "Dirección", ["g2h", "h2g"], "g2h");
  let t, h;
  const steps = [];
  if (dir === "g2h") {
    t = parseGregorian(input, "gdate", "Fecha gregoriana");
    h = toHijri(t);
    if (h.y < H_MIN || h.y > H_MAX) fail(`Rango admitido desde ${H_MIN} hasta ${H_MAX} en calendario hiyrí (aproximadamente de 1882 a 2174 d. C.).`, "gdate");
    steps.push(`Calculamos el número de días desde el inicio del calendario hiyrí hasta ${iso(t)} y lo comparamos con las tablas Umm al-Qura de duración de los meses.`);
  } else {
    const y = num(input, "hy", "Año hiyrí", { integer: true, min: H_MIN, max: H_MAX });
    const m = Number(choice(input, "hm", "Mes hiyrí", H_MONTHS.map((_, i) => String(i + 1)), "1"));
    const d = num(input, "hd", "Día", { integer: true, min: 1, max: 30 });
    const len = hijriMonthLength(y, m);
    if (d > len) fail(`El mes de ${H_MONTHS[m - 1]} de ${y} AH tiene solo ${len} días.`, "hd");
    t = fromHijri(y, m, d);
    if (t === null) fail("No se pudo convertir esta fecha.", "hy");
    h = { y, m, d };
    steps.push(`Estimamos la posición gregoriana con la duración media del mes lunar (29.53 días) y luego corregimos la estimación comparando día a día con las tablas Umm al-Qura.`);
  }
  const len = hijriMonthLength(h.y, h.m);
  const start = t - (h.d - 1) * DAY;
  steps.push(`El mes de ${H_MONTHS[h.m - 1]} de ${h.y} AH tiene ${len} días y comienza el ${gLong(start)}.`);
  steps.push("El inicio real del mes puede variar un día en algunos países que se basan en la observación de la luna.");
  const line = `${hLong(h)} = ${gLong(t)}`;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const tt = start + i * DAY;
    rows.push([`${i + 1} ${H_MONTHS[h.m - 1]}`, gLong(tt), i + 1 === h.d ? "◀" : ""]);
  }
  return {
    results: [
      { label: "Fecha hiyrí", value: hLong(h) },
      { label: "Fecha gregoriana", value: gLong(t) },
      { label: "En cifras", value: `${h.y}/${String(h.m).padStart(2, "0")}/${String(h.d).padStart(2, "0")} AH — ${iso(t)}` },
      { label: `Días de ${H_MONTHS[h.m - 1]} de ${h.y} AH`, value: `${len} días` }
    ],
    steps,
    blocks: [{ type: "table", caption: `Días del mes de ${H_MONTHS[h.m - 1]} de ${h.y} AH`, head: ["Hiyrí", "Gregoriano", ""], rows }],
    copy: line
  };
}

