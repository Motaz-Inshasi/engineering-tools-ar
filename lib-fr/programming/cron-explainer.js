import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW_AR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const SPECS = {
  minute: { label: "Minutes", min: 0, max: 59 },
  hour: { label: "Heures", min: 0, max: 23 },
  dom: { label: "Jour du mois", min: 1, max: 31 },
  month: { label: "Mois", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "Jour de la semaine", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["Minute", "Heure", "Jour du mois", "Mois", "Jour de la semaine"];
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
    if (idx < 0) fail(`Le nom « ${tok} » n'est pas reconnu dans le champ ${spec.label}.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`La valeur « ${tok} » dans le champ ${spec.label} n'est pas valide.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`La valeur ${v} est hors de la plage ${spec.min}-${top} dans le champ ${spec.label}.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`Le champ ${spec.label} est vide.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`Le champ ${spec.label} contient une valeur vide entre les virgules.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`Syntaxe du pas invalide dans le champ ${spec.label} : « ${part} ».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`Le pas dans le champ ${spec.label} doit être un nombre supérieur à zéro : « ${stepTok} ».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`La plage « ${range} » n'est pas valide dans le champ ${spec.label}.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`La plage « ${range} » est inversée dans le champ ${spec.label} (le début est supérieur à la fin).`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`Le raccourci « ${text} » est inconnu. Raccourcis pris en charge : @yearly, @monthly, @weekly, @daily, @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`L'expression doit contenir 5 champs (minute, heure, jour du mois, mois, jour de la semaine), mais elle en contient ${parts.length}.`, "expr");
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
  if (s === "") fail("Saisissez la date de début au format AAAA-MM-JJ HH:MM.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("Le format de la date de début est invalide ; le format requis est AAAA-MM-JJ HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("Une valeur de la date de début est hors de la plage autorisée.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("Cette date n'existe pas dans le calendrier.", "start");
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
  if (v.length === 60) return "Chaque minute";
  if (v.length === 1) return `À la minute ${v[0]}`;
  if (isRange(v)) return `De la minute ${v[0]} à ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `Toutes les ${n} minutes` + (v[0] ? ` à partir de la minute ${v[0]}` : "");
  return `Aux minutes ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `À ${v[0]} h`;
  if (isRange(v)) return `De ${v[0]} h à ${v[v.length - 1]} h`;
  const n = stepOf(v);
  if (n) return `Toutes les ${n} heures` + (v[0] ? ` à partir de ${v[0]} h` : "");
  return `Aux heures ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `Le jour ${v[0]} du mois`;
  if (isRange(v)) return `Du jour ${v[0]} au jour ${v[v.length - 1]} du mois`;
  return `Les jours ${abbrev(v.map(String))} du mois`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `Le ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `Du ${DOW_AR[v[0]]} au ${DOW_AR[v[v.length - 1]]}`;
  return `Les ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `En ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `Du ${MONTH_AR[v[0] - 1]} au ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `Aux mois de ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} ou ${b}` : `${a} et ${b}`;
  return a || b || "Chaque jour";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["Chaque minute"];
  if (hAll) return [`${minutePart(p.minute)} de chaque heure`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`À ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "Chaque heure" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "Chaque jour du mois", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "Chaque mois", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "Chaque jour de la semaine", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "Expliquez l'expression cron à cinq champs en français clair : une description en langage naturel, le détail de chaque champ avec ses valeurs développées, les premières exécutions à venir en UTC, avec la prise en charge des raccourcis comme @daily.",
  keywords: ["cron", "crontab", "expression cron", "planification", "tâches planifiées", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "Règle combinée du jour du mois et du jour de la semaine", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "expression cron", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "Cinq champs : minute, heure, jour du mois, mois, jour de la semaine. Ou un raccourci comme @daily." },
    { id: "start", label: "Date et heure de début (UTC)", type: "text", default: "2026-01-05 08:00", help: "Au format AAAA-MM-JJ HH:MM, en temps universel coordonné (UTC)." },
    { id: "count", label: "Nombre d'exécutions affichées", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["Toutes les 15 minutes, de 9 h à 17 h, du lundi au vendredi"], note: "Exemple : toutes les 15 minutes entre 9 h et 17 h, les jours ouvrés, du lundi au vendredi." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("Saisissez une expression cron.", "expr");
  const count = Number(choice(input, "count", "Nombre d'exécutions", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "Détail des champs", head: ["Champ", "Valeur", "Signification", "Valeurs développées"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "Prochaines exécutions (UTC)",
      head: ["Date et heure", "Jour"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `Aucune exécution correspondante n'a été trouvée dans les ${MAX_YEARS} ans suivant la date de début. Vérifiez l'expression ; par exemple, le 30 février n'existe pas.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `Aucune autre exécution n'a été trouvée dans les ${MAX_YEARS} ans suivant la date de début.`, tone: "warn" });
  blocks.push({ type: "note", text: "Les heures sont en UTC. La recherche commence à la minute indiquée et l'inclut si elle correspond." });
  const results = [
    { label: "Description", value: desc },
    { label: "Première exécution", value: runs.length ? formatRun(runs[0]) : "Aucune" },
    { label: "Nombre d'exécutions affichées", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`Le raccourci ${p.macro} équivaut à l'expression « ${p.src.join(" ")} ».`);
  steps.push(`L'expression a été découpée en 5 champs : ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "Comme le jour du mois et le jour de la semaine sont tous deux restreints, un jour correspond si l'un des deux correspond." : "Le jour du mois et le jour de la semaine ne sont pas tous deux restreints ; le jour doit donc correspondre à tous les champs.");
  steps.push(`Le programme recherche minute par minute en ignorant les jours et heures qui ne correspondent pas, à partir de ${formatRun(start)} UTC.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. Première exécution : ${formatRun(runs[0])}` : ". Aucune exécution à venir");
  return { results, steps, copy, blocks };
}
