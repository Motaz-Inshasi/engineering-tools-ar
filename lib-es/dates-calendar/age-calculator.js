import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "Calcule su edad con precisión en años, meses y días; en días, semanas y horas; su edad en el calendario hiyrí; el día de la semana en que nació; y cuánto falta para su próximo cumpleaños en ambos calendarios.",
  keywords: ["Cálculo de la edad", "cuántos años tengo", "age calculator", "fecha de nacimiento", "cumpleaños", "edad en el calendario hiyrí", "edad en días"],
  formulas: [{ label: "Edad", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "fecha de nacimiento", type: "text", default: "2000-05-15", help: "Con el formato YYYY-MM-DD o DD/MM/YYYY." },
    { id: "ref", label: "Calcular la edad en una fecha (opcional)", type: "text", default: "", help: "Déjelo vacío para usar la fecha de hoy." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 años, 5 meses, 29 días"], note: "Ejemplo: nacido el 15 de mayo de 2000; edad a fecha del 13 de noviembre de 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "fecha de nacimiento");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "Fecha de cálculo");
  if (b > r) fail("La fecha de nacimiento es posterior a la fecha de cálculo.", "birth");
  const ymd = diffYMD(b, r);
  const days = Math.round((r - b) / DAY);
  const hb = toHijri(b), hr = toHijri(r);
  let hy = hr.y - hb.y;
  if (hr.m < hb.m || (hr.m === hb.m && hr.d < hb.d)) hy--;
  const totalMonths = ymd.y * 12 + ymd.m;
  let next = addMonths(b, (ymd.y + 1) * 12);
  if (ymd.m === 0 && ymd.d === 0) next = r;
  const toNext = Math.round((next - r) / DAY);
  let nh = null;
  for (let y = hr.y; y <= hr.y + 1 && nh === null; y++) {
    const t = fromHijri(y, hb.m, Math.min(hb.d, 29));
    if (t !== null && t >= r) nh = t;
  }
  const results = [
    { label: "Edad", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "edad en el calendario hiyrí", value: `${hy} años hiyríes aproximadamente` },
    { label: "En meses / semanas / días", value: `${totalMonths.toLocaleString("en-US")} meses / ${Math.floor(days / 7).toLocaleString("en-US")} semanas / ${days.toLocaleString("en-US")} días` },
    { label: "En horas, aproximadamente", value: `${(days * 24).toLocaleString("en-US")} horas` },
    { label: "Día de nacimiento", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "Próximo cumpleaños", value: toNext === 0 ? "¡Hoy! Feliz cumpleaños" : `${gLong(next)} (dentro de ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "Próximo aniversario hiyrí", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `Desde ${gLong(b)} hasta ${gLong(r)}.`,
      `Contamos primero los años completos, luego los meses completos y después los días restantes: ${ymdText(ymd)}.`,
      `Total de días = ${days.toLocaleString("en-US")}. El año hiyrí es unos 11 días más corto que el gregoriano, por lo que la edad hiyrí es algo mayor (${hy}).`
    ],
    copy: `Edad en ${iso(r)}: ${ymdText(ymd)} (${days.toLocaleString("en-US")} días)`
  };
}
