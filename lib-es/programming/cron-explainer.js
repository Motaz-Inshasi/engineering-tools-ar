import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW_AR = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const SPECS = {
  minute: { label: "Minutos", min: 0, max: 59 },
  hour: { label: "Horas", min: 0, max: 23 },
  dom: { label: "Día del mes", min: 1, max: 31 },
  month: { label: "Mes", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "Día de la semana", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["Minuto", "Hora", "Día del mes", "Mes", "Día de la semana"];
const MACROS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *"
};
const MAX_YEARS = 5;
const MAX_STEPS = 2000000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function atom(tok, spec) {
  if (spec.names && /^[A-Za-z]+$/.test(tok)) {
    const idx = spec.names.indexOf(tok.toUpperCase());
    if (idx < 0) fail(`El nombre «${tok}» no se reconoce en el campo ${spec.label}.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`El valor «${tok}» del campo ${spec.label} no es válido.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`El valor ${v} está fuera del rango ${spec.min}-${top} en el campo ${spec.label}.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`El campo ${spec.label} está vacío.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`En el campo ${spec.label} hay un valor vacío entre las comas.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`El formato del paso no es válido en el campo ${spec.label}: «${part}».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`El paso en el campo ${spec.label} debe ser un número mayor que cero: «${stepTok}».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`El rango «${range}» no es válido en el campo ${spec.label}.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`El rango «${range}» está invertido en el campo ${spec.label} (el inicio es mayor que el final).`, "expr");
    } else {
      lo = atom(range, spec);
      hi = stepTok !== undefined ? spec.max : lo;
    }
    for (let v = lo; v <= hi; v += step) vals.add(spec.inMax === 7 && v === 7 ? 0 : v);
  }
  return [...vals].sort((a, b) => a - b);
}

export function parseCron(expr) {
  const text = String(expr).trim();
  let macro = null;
  let src = text;
  if (text.startsWith("@")) {
    macro = text.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`El atajo «${text}» no se reconoce. Atajos admitidos: @yearly, @monthly, @weekly, @daily, @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`La expresión debe tener 5 campos (minuto, hora, día del mes, mes, día de la semana), pero tiene ${parts.length}.`, "expr");
  const [mi, ho, dom, mo, dow] = parts;
  return {
    macro,
    src: parts,
    minute: parseField(mi, SPECS.minute),
    hour: parseField(ho, SPECS.hour),
    dom: parseField(dom, SPECS.dom),
    month: parseField(mo, SPECS.month),
    dow: parseField(dow, SPECS.dow),
    domR: !dom.startsWith("*"),
    dowR: !dow.startsWith("*")
  };
}

export function parseStart(raw) {
  const s = String(raw ?? "").trim();
  if (s === "") fail("Introduce la fecha de inicio en formato YYYY-MM-DD HH:MM.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("El formato de la fecha de inicio no es válido; el formato requerido es YYYY-MM-DD HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("Un valor de la fecha de inicio está fuera del rango permitido.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("Esta fecha no existe en el calendario.", "start");
  return date;
}

export function formatRun(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function dayMatches(p, d) {
  const domOk = p.dom.includes(d.getUTCDate());
  const dowOk = p.dow.includes(d.getUTCDay());
  return p.domR && p.dowR ? domOk || dowOk : domOk && dowOk;
}

export function nextRuns(p, start, count) {
  const out = [];
  const endMs = Date.UTC(start.getUTCFullYear() + MAX_YEARS, start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes());
  let t = start.getTime();
  for (let steps = 0; out.length < count && t <= endMs && steps < MAX_STEPS; steps++) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const dd = d.getUTCDate();
    const h = d.getUTCHours();
    const mi = d.getUTCMinutes();
    if (!p.month.includes(mo + 1)) {
      t = Date.UTC(y, mo + 1, 1);
      continue;
    }
    if (!dayMatches(p, d)) {
      t = Date.UTC(y, mo, dd + 1);
      continue;
    }
    if (!p.hour.includes(h)) {
      const nh = p.hour.find((v) => v > h);
      t = nh !== undefined ? Date.UTC(y, mo, dd, nh) : Date.UTC(y, mo, dd + 1);
      continue;
    }
    if (!p.minute.includes(mi)) {
      const nm = p.minute.find((v) => v > mi);
      t = nm !== undefined ? Date.UTC(y, mo, dd, h, nm) : Date.UTC(y, mo, dd, h + 1);
      continue;
    }
    out.push(d);
    t += 60000;
  }
  return out;
}

function isRange(v) {
  return v.length > 1 && v.every((x, i) => i === 0 || x === v[i - 1] + 1);
}

function stepOf(v) {
  if (v.length < 3) return 0;
  const n = v[1] - v[0];
  return n > 1 && v.every((x, i) => i === 0 || x - v[i - 1] === n) ? n : 0;
}

function abbrev(items) {
  if (items.length <= 12) return items.join("، ");
  return `${items.slice(0, 6).join("، ")}, …, ${items.slice(-2).join("، ")} (total ${items.length})`;
}

function minutePart(v) {
  if (v.length === 60) return "cada minuto";
  if (v.length === 1) return `en el minuto ${v[0]}`;
  if (isRange(v)) return `del minuto ${v[0]} al ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `cada ${n} minutos` + (v[0] ? ` a partir del minuto ${v[0]}` : "");
  return `en los minutos ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `a las ${v[0]}`;
  if (isRange(v)) return `de las ${v[0]} a las ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `cada ${n} horas` + (v[0] ? ` a partir de las ${v[0]}` : "");
  return `en las horas ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `el día ${v[0]} del mes`;
  if (isRange(v)) return `del día ${v[0]} al ${v[v.length - 1]} del mes`;
  return `en los días ${abbrev(v.map(String))} del mes`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `el ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `de ${DOW_AR[v[0]]} a ${DOW_AR[v[v.length - 1]]}`;
  return `días ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `en ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `de ${MONTH_AR[v[0] - 1]} a ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `en los meses ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} o ${b}` : `${a} y ${b}`;
  return a || b || "todos los días";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["cada minuto"];
  if (hAll) return [`${minutePart(p.minute)} de cada hora`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`las ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "cada hora" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "todos los días del mes", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "todos los meses", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "todos los días de la semana", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "Explica una expresión cron de cinco campos en lenguaje claro: descripción natural, desglose de cada campo con sus valores expandidos y cálculo de las próximas ejecuciones en UTC, con atajos como @daily.",
  keywords: ["cron", "crontab", "expresión cron", "programación", "tareas programadas", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "Regla de día del mes y día de la semana combinados", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "expresión cron", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "Cinco campos: minuto, hora, día del mes, mes y día de la semana. O un atajo como @daily." },
    { id: "start", label: "Fecha y hora de inicio (UTC)", type: "text", default: "2026-01-05 08:00", help: "En formato YYYY-MM-DD HH:MM, en hora universal UTC." },
    { id: "count", label: "Número de ejecuciones mostradas", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["cada 15 minutos, de las 9 a las 17, de lunes a viernes"], note: "Ejemplo: cada 15 minutos entre las 9 y las 17 en días laborables, de lunes a viernes." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("Introduce una expresión cron.", "expr");
  const count = Number(choice(input, "count", "Ejecuciones", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "Desglose de los campos", head: ["Campo", "Valor", "Significado", "Valores expandidos"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "Próximas ejecuciones (UTC)",
      head: ["Fecha y hora", "Día"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `No se encontró ninguna ejecución coincidente en ${MAX_YEARS} años desde la fecha de inicio. Revisa la expresión; por ejemplo, el día 30 de febrero no existe.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `No se encontraron más ejecuciones en ${MAX_YEARS} años desde la fecha de inicio.`, tone: "warn" });
  blocks.push({ type: "note", text: "Las horas están en UTC. La búsqueda empieza en el minuto indicado y lo incluye si coincide." });
  const results = [
    { label: "Significado en español", value: desc },
    { label: "Primera ejecución", value: runs.length ? formatRun(runs[0]) : "Ninguna" },
    { label: "Número de ejecuciones mostradas", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`El atajo ${p.macro} equivale a la expresión «${p.src.join(" ")}».`);
  steps.push(`La expresión se divide en 5 campos: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "Como el día del mes y el día de la semana están restringidos a la vez, el día coincide si cumple cualquiera de los dos." : "El día del mes y el día de la semana no están restringidos a la vez, así que el día debe cumplir todos los campos.");
  steps.push(`El programa busca minuto a minuto, saltando los días y las horas que no coinciden, a partir de ${formatRun(start)} UTC.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. Primera ejecución: ${formatRun(runs[0])}` : ". No hay ejecuciones próximas");
  return { results, steps, copy, blocks };
}
