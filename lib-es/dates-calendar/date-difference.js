import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "Calcule la duración entre dos fechas en años, meses y días, o en días, semanas y días laborables; o sume o reste un número de días a una fecha para conocer la fecha resultante y su día de la semana.",
  keywords: ["Diferencia entre dos fechas", "número de días entre dos fechas", "cálculo de la duración", "sumar días", "date difference", "days between dates", "días laborables", "cuántos días"],
  formulas: [{ label: "Duración en días", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "Operación", type: "select", default: "diff", options: [["diff", "Diferencia entre dos fechas"], ["add", "Sumar o restar días"]] },
    { id: "d1", label: "Primera fecha (o inicio)", type: "text", default: "2026-01-01", help: "Con el formato YYYY-MM-DD o DD/MM/YYYY." },
    { id: "d2", label: "Segunda fecha", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "Contar el día final dentro del período", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "Fin de semana (para calcular días laborables)", type: "select", default: "fs", options: [["fs", "Viernes y sábado"], ["ss", "Sábado y domingo"], ["f", "Solo viernes"], ["none", "Sin fin de semana"]], when: { mode: ["diff"] } },
    { id: "days", label: "Número de días (negativo para restar)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 días", "11 meses, 30 días"], note: "Ejemplo: ¿cuántos días hay entre el inicio y el final del año 2026?" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "Operación", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "Primera fecha");
  if (mode === "add") {
    const k = num(input, "days", "Número de días", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("La fecha resultante está fuera del rango admitido.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "Fecha resultante", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} días = ${iso(t)}` },
        { label: "En hiyrí (Umm al-Qura)", value: hLong(h) },
        { label: "Día", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `Convertimos ${iso(a)} a un número de día consecutivo y luego ${k >= 0 ? "sumamos" : "restamos"} ${daysW(Math.abs(k))}.`,
        `El cálculo tiene en cuenta automáticamente la longitud de los meses y los años bisiestos (febrero tiene 29 días en el año bisiesto).`,
        `Resultado: ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} días = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "Segunda fecha");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "Fin de semana", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "Duración en días", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "En años, meses y días", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "En semanas", value: `${weeksW(full)}${rem ? ` y ${daysW(rem)}` : ""}` },
    { label: "días laborables", value: daysW(work) },
    { label: "En horas", value: `${(n * 24).toLocaleString("en-US")} horas` }
  ];
  const steps = [
    a > b ? "La primera fecha es posterior a la segunda, así que hemos invertido su orden para calcular una duración positiva." : `Desde ${gLong(s)} hasta ${gLong(e)}.`,
    `Número de días = diferencia entre los números de los dos días${inc ? " + 1 (para contar el día final)" : ""} = ${n}.`,
    `Contamos primero los meses completos y luego los días restantes: ${ymdText(ymd)}.`,
    `Días laborables: se excluyen los días de fin de semana (${we.length ? we.map((d) => WEEKDAYS[d]).join(" y ") : "ninguno"}), sin contar los festivos oficiales.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
