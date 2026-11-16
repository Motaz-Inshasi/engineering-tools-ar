import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DOW_AR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const SPECS = {
  minute: { label: "Dakikalar", min: 0, max: 59 },
  hour: { label: "Saatler", min: 0, max: 23 },
  dom: { label: "Ayın günü", min: 1, max: 31 },
  month: { label: "Ay", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "Haftanın günü", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["Dakika", "Saat", "Ayın günü", "Ay", "Haftanın günü"];
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
    if (idx < 0) fail(`«${tok}» adı ${spec.label} alanında bilinmiyor.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`${spec.label} alanındaki «${tok}» değeri geçersiz.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`${spec.label} alanında ${v} değeri ${spec.min}-${top} aralığının dışında.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`${spec.label} alanı boş.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`${spec.label} alanında virgüller arasında boş bir değer var.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`${spec.label} alanında adım biçimi geçersiz: «${part}».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`${spec.label} alanında adım sıfırdan büyük bir sayı olmalıdır: «${stepTok}».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`«${range}» aralığı ${spec.label} alanında geçersiz.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`«${range}» aralığı ${spec.label} alanında ters (başlangıç bitişten büyük).`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`«${text}» kısaltması bilinmiyor. Desteklenen kısaltmalar: @yearly, @monthly, @weekly, @daily, @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`İfade 5 alan içermelidir (dakika saat ayın-günü ay haftanın-günü), ancak ${parts.length} alan içeriyor.`, "expr");
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
  if (s === "") fail("Başlangıç tarihini YYYY-MM-DD HH:MM biçiminde girin.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("Başlangıç tarihi biçimi geçersiz; istenen biçim YYYY-MM-DD HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("Başlangıç tarihinin bir değeri izin verilen aralığın dışında.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("Bu tarih takvimde yok.", "start");
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
  return `${items.slice(0, 6).join("، ")}, …, ${items.slice(-2).join("، ")} (toplam ${items.length})`;
}

function minutePart(v) {
  if (v.length === 60) return "Her dakika";
  if (v.length === 1) return `Dakika ${v[0]}`;
  if (isRange(v)) return `Dakika ${v[0]} ile ${v[v.length - 1]} arasında`;
  const n = stepOf(v);
  if (n) return `Her ${n} dakikada bir` + (v[0] ? ` (${v[0]}. dakikadan başlayarak)` : "");
  return `Dakikalarda ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `Saat ${v[0]}`;
  if (isRange(v)) return `Saat ${v[0]} ile ${v[v.length - 1]} arasında`;
  const n = stepOf(v);
  if (n) return `Her ${n} saatte bir` + (v[0] ? ` (${v[0]}. saatten başlayarak)` : "");
  return `Saatlerde ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `Ayın ${v[0]}. gününde`;
  if (isRange(v)) return `Ayın ${v[0]}. ile ${v[v.length - 1]}. günleri arasında`;
  return `Ayın şu günlerinde: ${abbrev(v.map(String))}`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `${DOW_AR[v[0]]} günü`;
  if (isRange(v)) return `${DOW_AR[v[0]]} ile ${DOW_AR[v[v.length - 1]]} arasında`;
  return `${abbrev(v.map((d) => DOW_AR[d]))} günlerinde`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `${MONTH_AR[v[0] - 1]} ayında`;
  if (isRange(v)) return `${MONTH_AR[v[0] - 1]} ile ${MONTH_AR[v[v.length - 1] - 1]} arasında`;
  return `Şu aylarda: ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} veya ${b}` : `${a} ve ${b}`;
  return a || b || "Her gün";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["Her dakika"];
  if (hAll) return [`Her saatin ${minutePart(p.minute)}`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`Saat ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "Her saat" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "Ayın her günü", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "Her ay", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "Haftanın her günü", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "Beş alanlı cron ifadesini açık bir Türkçeyle açıklar: doğal dil tanımı, her alanın genişletilmiş değerleriyle ayrıştırılması ve UTC saatine göre bir sonraki çalışmaların hesaplanması; @daily gibi kısaltmaları da destekler.",
  keywords: ["cron", "crontab", "cron ifadesi", "zamanlama", "zamanlanmış görevler", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "Ayın günü ve haftanın günü birlikte kuralı", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "cron ifadesi", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "Beş alan: dakika, saat, ayın günü, ay, haftanın günü. Ya da @daily gibi bir kısaltma." },
    { id: "start", label: "Başlangıç tarihi ve saati (UTC)", type: "text", default: "2026-01-05 08:00", help: "YYYY-MM-DD HH:MM biçiminde, UTC saat diliminde." },
    { id: "count", label: "Gösterilecek çalışma sayısı", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["Her 15 dakikada, 9 ile 17 saatleri arasında, Pazartesi ile Cuma arasında"], note: "Örnek: hafta içi, 9 ile 17 saatleri arasında her 15 dakikada bir." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("Bir cron ifadesi girin.", "expr");
  const count = Number(choice(input, "count", "Çalışma sayısı", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "Alanların ayrıştırılması", head: ["Alan", "Değer", "Anlam", "Genişletilmiş değerler"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "Gelecekteki ilk çalışmalar (UTC)",
      head: ["Tarih ve saat", "Gün"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `Başlangıç tarihinden itibaren ${MAX_YEARS} yıl içinde eşleşen bir çalışma bulunamadı. İfadeyi kontrol edin; örneğin 30 Şubat diye bir tarih yoktur.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `Başlangıç tarihinden itibaren ${MAX_YEARS} yıl içinde başka çalışma bulunamadı.`, tone: "warn" });
  blocks.push({ type: "note", text: "Saatler UTC'dir. Arama belirtilen dakikadan başlar ve eşleşiyorsa o dakikayı da içerir." });
  const results = [
    { label: "Türkçe açıklama", value: desc },
    { label: "İlk çalışma", value: runs.length ? formatRun(runs[0]) : "Yok" },
    { label: "Gösterilecek çalışma sayısı", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`${p.macro} kısaltması «${p.src.join(" ")}» ifadesine eşdeğerdir.`);
  steps.push(`İfade 5 alana ayrıldı: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "Ayın günü ve haftanın günü birlikte kısıtlandığı için, bunlardan biri uyuştuğunda gün eşleşmiş sayılır." : "Ayın günü ve haftanın günü birlikte kısıtlanmadığı için gün, tüm alanlarla uyuşmalıdır.");
  steps.push(`Program dakika dakika arar; eşleşmeyen günleri ve saatleri atlayarak ${formatRun(start)} UTC'den başlar.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. İlk çalışma: ${formatRun(runs[0])}` : ". Gelecek çalışma yok");
  return { results, steps, copy, blocks };
}
