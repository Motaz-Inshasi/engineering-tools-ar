import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DOW_AR = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const SPECS = {
  minute: { label: "Menit", min: 0, max: 59 },
  hour: { label: "Jam", min: 0, max: 23 },
  dom: { label: "Tanggal dalam bulan", min: 1, max: 31 },
  month: { label: "Bulan", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "Hari dalam minggu", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["Menit", "Jam", "Tanggal dalam bulan", "Bulan", "Hari dalam minggu"];
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
    if (idx < 0) fail(`Nama «${tok}» tidak dikenal di kolom ${spec.label}.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`Nilai «${tok}» di kolom ${spec.label} tidak valid.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`Nilai ${v} berada di luar rentang ${spec.min}-${top} di kolom ${spec.label}.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`Kolom ${spec.label} kosong.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`Kolom ${spec.label} memiliki nilai kosong di antara tanda koma.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`Sintaks langkah tidak valid di kolom ${spec.label}: «${part}».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`Langkah di kolom ${spec.label} harus berupa angka lebih besar dari nol: «${stepTok}».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`Rentang «${range}» tidak valid di kolom ${spec.label}.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`Rentang «${range}» terbalik di kolom ${spec.label} (awal lebih besar dari akhir).`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`Singkatan «${text}» tidak dikenal. Singkatan yang didukung: @yearly, @monthly, @weekly, @daily, @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`Ekspresi harus memiliki 5 kolom (menit, jam, tanggal dalam bulan, bulan, hari dalam minggu), tetapi memiliki ${parts.length}.`, "expr");
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
  if (s === "") fail("Masukkan tanggal mulai dengan format YYYY-MM-DD HH:MM.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("Format tanggal mulai tidak valid; format yang diperlukan adalah YYYY-MM-DD HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("Salah satu nilai pada tanggal mulai berada di luar rentang yang diizinkan.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("Tanggal ini tidak ada dalam kalender.", "start");
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
  if (v.length === 60) return "Setiap menit";
  if (v.length === 1) return `Pada menit ${v[0]}`;
  if (isRange(v)) return `Dari menit ${v[0]} sampai ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `Setiap ${n} menit` + (v[0] ? ` mulai dari menit ${v[0]}` : "");
  return `Pada menit ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `Pada jam ${v[0]}`;
  if (isRange(v)) return `Dari jam ${v[0]} sampai ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `Setiap ${n} jam` + (v[0] ? ` mulai dari jam ${v[0]}` : "");
  return `Pada jam ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `Pada tanggal ${v[0]} setiap bulan`;
  if (isRange(v)) return `Dari tanggal ${v[0]} sampai ${v[v.length - 1]} setiap bulan`;
  return `Pada tanggal ${abbrev(v.map(String))} setiap bulan`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `Pada hari ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `Dari ${DOW_AR[v[0]]} sampai ${DOW_AR[v[v.length - 1]]}`;
  return `Pada hari ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `Pada bulan ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `Dari ${MONTH_AR[v[0] - 1]} sampai ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `Pada bulan ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} atau ${b}` : `${a} dan ${b}`;
  return a || b || "Setiap hari";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["Setiap menit"];
  if (hAll) return [`${minutePart(p.minute)} setiap jam`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`Pukul ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "Setiap jam" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "Setiap hari dalam bulan", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "Setiap bulan", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "Setiap hari dalam minggu", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "Jelaskan ekspresi cron lima kolom dalam bahasa Indonesia yang jelas: deskripsi alami, rincian setiap kolom beserta nilai yang diperluas, dan eksekusi berikutnya dalam UTC, dengan dukungan singkatan seperti @daily.",
  keywords: ["cron", "crontab", "ekspresi cron", "penjadwalan", "tugas terjadwal", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "Aturan gabungan tanggal dalam bulan dan hari dalam minggu", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "ekspresi cron", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "Lima kolom: menit, jam, tanggal dalam bulan, bulan, hari dalam minggu. Atau singkatan seperti @daily." },
    { id: "start", label: "Tanggal dan waktu mulai (UTC)", type: "text", default: "2026-01-05 08:00", help: "Dalam format YYYY-MM-DD HH:MM, menurut waktu UTC (Coordinated Universal Time)." },
    { id: "count", label: "Jumlah eksekusi yang ditampilkan", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["Setiap 15 menit, dari jam 9 sampai 17, dari Senin sampai Jumat"], note: "Contoh: setiap 15 menit antara pukul 9.00 dan 17.00 pada hari kerja, dari Senin sampai Jumat." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("Masukkan ekspresi cron.", "expr");
  const count = Number(choice(input, "count", "Jumlah eksekusi", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "Rincian kolom", head: ["Kolom", "Nilai", "Arti", "Nilai yang diperluas"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "Eksekusi berikutnya (UTC)",
      head: ["Tanggal dan waktu", "Hari"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `Tidak ditemukan eksekusi yang cocok dalam ${MAX_YEARS} tahun dari tanggal mulai. Periksa ekspresinya; misalnya, tanggal 30 Februari tidak ada.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `Tidak ditemukan eksekusi lain dalam ${MAX_YEARS} tahun dari tanggal mulai.`, tone: "warn" });
  blocks.push({ type: "note", text: "Waktu dinyatakan dalam UTC. Pencarian dimulai dari menit yang ditentukan dan menyertakannya jika cocok." });
  const results = [
    { label: "Arti dalam bahasa Indonesia", value: desc },
    { label: "Eksekusi pertama", value: runs.length ? formatRun(runs[0]) : "Tidak ada" },
    { label: "Jumlah eksekusi yang ditampilkan", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`Singkatan ${p.macro} setara dengan ekspresi «${p.src.join(" ")}».`);
  steps.push(`Ekspresi dibagi menjadi 5 kolom: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "Karena tanggal dalam bulan dan hari dalam minggu sama-sama dibatasi, sebuah hari dianggap cocok jika salah satunya cocok." : "Tanggal dalam bulan dan hari dalam minggu tidak sama-sama dibatasi, sehingga hari harus cocok dengan semua kolom.");
  steps.push(`Program mencari menit demi menit dengan melewati hari dan jam yang tidak cocok, dimulai dari ${formatRun(start)} UTC.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. Eksekusi pertama: ${formatRun(runs[0])}` : ". Tidak ada eksekusi berikutnya");
  return { results, steps, copy, blocks };
}
