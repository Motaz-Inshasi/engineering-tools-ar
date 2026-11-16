import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW_AR = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SPECS = {
  minute: { label: "Minutes", min: 0, max: 59 },
  hour: { label: "Hours", min: 0, max: 23 },
  dom: { label: "Day of month", min: 1, max: 31 },
  month: { label: "Month", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "Day of week", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["Minute", "Hour", "Day of month", "Month", "Day of week"];
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
    if (idx < 0) fail(`The name “${tok}” is not recognized in the ${spec.label} field.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`The value “${tok}” in the ${spec.label} field is invalid.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`The value ${v} is outside the range ${spec.min}-${top} in the ${spec.label} field.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`The ${spec.label} field is empty.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`The ${spec.label} field has an empty value between commas.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`Invalid step syntax in the ${spec.label} field: “${part}”.`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`The step in the ${spec.label} field must be a number greater than zero: “${stepTok}”.`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`The range “${range}” is invalid in the ${spec.label} field.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`The range “${range}” is reversed in the ${spec.label} field (the start is greater than the end).`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`The shortcut “${text}” is unknown. Supported shortcuts: @yearly, @monthly, @weekly, @daily, @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`The expression must contain 5 fields (minute, hour, day of month, month, day of week), but it contains ${parts.length}.`, "expr");
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
  if (s === "") fail("Enter the start date in the format YYYY-MM-DD HH:MM.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("The start date format is invalid; the required format is YYYY-MM-DD HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("A value in the start date is outside the allowed range.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("This date does not exist in the calendar.", "start");
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
  if (v.length === 60) return "Every minute";
  if (v.length === 1) return `At minute ${v[0]}`;
  if (isRange(v)) return `From minute ${v[0]} to ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `Every ${n} minutes` + (v[0] ? ` starting at minute ${v[0]}` : "");
  return `At minutes ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `At hour ${v[0]}`;
  if (isRange(v)) return `From hour ${v[0]} to ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `Every ${n} hours` + (v[0] ? ` starting at hour ${v[0]}` : "");
  return `At hours ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `On day ${v[0]} of the month`;
  if (isRange(v)) return `From day ${v[0]} to ${v[v.length - 1]} of the month`;
  return `On days ${abbrev(v.map(String))} of the month`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `On ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `From ${DOW_AR[v[0]]} to ${DOW_AR[v[v.length - 1]]}`;
  return `On ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `In ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `From ${MONTH_AR[v[0] - 1]} to ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `In the months ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} or ${b}` : `${a} and ${b}`;
  return a || b || "Every day";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["Every minute"];
  if (hAll) return [`${minutePart(p.minute)} of every hour`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`At ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "Every hour" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "Every day of the month", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "Every month", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "Every day of the week", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "Explain the five-field cron expression in clear English: a natural-language description, a breakdown of each field with its expanded values, the first upcoming runs in UTC, with support for shortcuts such as @daily.",
  keywords: ["cron", "crontab", "cron expression", "scheduling", "scheduled jobs", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "Combined day-of-month and day-of-week rule", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "cron expression", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "Five fields: minute, hour, day of month, month, day of week. Or a shortcut such as @daily." },
    { id: "start", label: "Start date and time (UTC)", type: "text", default: "2026-01-05 08:00", help: "In the format YYYY-MM-DD HH:MM, in Coordinated Universal Time (UTC)." },
    { id: "count", label: "Number of runs shown", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["Every 15 minutes, from hour 9 to 17, from Monday to Friday"], note: "Example: every 15 minutes between 9:00 and 17:00 on weekdays, from Monday to Friday." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("Enter a cron expression.", "expr");
  const count = Number(choice(input, "count", "Number of runs", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "Field breakdown", head: ["Field", "Value", "Meaning", "Expanded values"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "Next runs (UTC)",
      head: ["Date and time", "Day"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `No matching run was found within ${MAX_YEARS} years of the start date. Check the expression; for example, the 30th of February does not exist.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `No other runs were found within ${MAX_YEARS} years of the start date.`, tone: "warn" });
  blocks.push({ type: "note", text: "Times are in UTC. The search starts at the specified minute and includes it if it matches." });
  const results = [
    { label: "Description", value: desc },
    { label: "First run", value: runs.length ? formatRun(runs[0]) : "None" },
    { label: "Number of runs shown", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`The shortcut ${p.macro} is equivalent to the expression “${p.src.join(" ")}”.`);
  steps.push(`The expression was split into 5 fields: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "Because the day of month and the day of week are both restricted, a day matches if either one matches." : "The day of month and the day of week are not both restricted, so the day must match all fields.");
  steps.push(`The program searches minute by minute, skipping non-matching days and hours, starting from ${formatRun(start)} UTC.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. First run: ${formatRun(runs[0])}` : ". No upcoming runs");
  return { results, steps, copy, blocks };
}
