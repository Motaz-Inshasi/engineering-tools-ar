import { fail } from "../core/validate.js";

const MAX_CHARS = 200000;
const MAX_MATCHES = 500;
const EXPLAIN_LIMIT = 2000;
const LITERAL = /^\/([\s\S]*)\/([A-Za-z]*)$/;
const QUANT = /\{(\d+)(?:(,)(\d*))?\}/y;
const HEX2 = /[0-9a-fA-F]{2}/y;
const HEX4 = /[0-9a-fA-F]{4}/y;
const FLAG_SET = "dgimsuyv";

const ESCAPES = {
  d: "digit apa pun dari 0 sampai 9",
  D: "karakter apa pun yang bukan digit",
  w: "huruf Latin, digit, atau garis bawah _ apa pun",
  W: "karakter apa pun yang bukan huruf Latin, digit, atau _",
  s: "karakter spasi kosong apa pun (spasi, tab, atau baris baru)",
  S: "karakter apa pun yang bukan spasi kosong",
  b: "batas kata: posisi yang memisahkan karakter kata dari karakter bukan kata (tidak mengonsumsi karakter)",
  B: "bukan batas kata: posisi di dalam atau di luar kata (tidak mengonsumsi karakter)",
  n: "Baris baru (LF)",
  r: "Carriage return (CR)",
  t: "Tab",
  f: "Form feed",
  v: "Vertical tab"
};

const FLAG_INFO = {
  d: "menambahkan posisi awal dan akhir setiap grup (indices)",
  g: "mencari semua kecocokan, bukan hanya kecocokan pertama",
  i: "mengabaikan perbedaan huruf besar dan kecil",
  m: "membuat ^ dan $ cocok dengan awal dan akhir setiap baris",
  s: "membuat titik . juga cocok dengan baris baru (dotAll)",
  u: "memperlakukan pola dengan kode Unicode lengkap dan mendukung \\p{...}",
  y: "sticky: kecocokan dimulai tepat dari lastIndex tanpa melewati",
  v: "versi u yang lebih baru dengan dukungan kumpulan karakter tingkat lanjut"
};

function show(s) {
  const t = String(s).replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return t.split("$").length > 2 ? t.replace(/\$/g, "﹩") : t;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function codeBlock(inner) {
  return `<pre class="code" dir="ltr"><code>${inner}</code></pre>`;
}

function readFlags(raw) {
  const seen = new Set();
  for (const ch of raw) {
    if (!FLAG_SET.includes(ch)) fail(`Flag «${ch}» tidak didukung. Flag yang diizinkan: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`Flag «${ch}» berulang.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`Kumpulan flag tidak valid dalam JavaScript: ${e.message}`, "flags");
  }
  return raw;
}

function nextIndex(text, i, unicode) {
  if (!unicode) return i + 1;
  const cp = text.codePointAt(i);
  return i + (cp !== undefined && cp > 0xffff ? 2 : 1);
}

function toMatch(m) {
  return {
    index: m.index,
    text: m[0],
    groups: m.slice(1),
    named: m.groups ? { ...m.groups } : null
  };
}

export function findMatches(re, text, limit = MAX_MATCHES) {
  const loop = re.global || re.sticky;
  const list = [];
  let truncated = false;
  re.lastIndex = 0;
  for (;;) {
    const m = re.exec(text);
    if (m === null) break;
    if (list.length === limit) {
      truncated = true;
      break;
    }
    list.push(toMatch(m));
    if (!loop) break;
    if (m[0] === "") re.lastIndex = nextIndex(text, re.lastIndex, re.unicode || re.unicodeSets);
  }
  re.lastIndex = 0;
  return { list, truncated };
}

export function analyze(input) {
  const raw = String(input.pattern ?? "");
  const lit = raw.trim().match(LITERAL);
  const pattern = lit ? lit[1] : raw;
  const flags = readFlags(lit ? lit[2] : String(input.flags ?? "").trim());
  const text = String(input.text ?? "");
  const replace = String(input.replace ?? "");
  if (pattern.length > MAX_CHARS) fail(`Pola lebih dari ${MAX_CHARS} karakter.`, "pattern");
  if (text.length > MAX_CHARS) fail(`Teks lebih dari ${MAX_CHARS} karakter.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`Pola ekspresi tidak valid: ${e.message}`, "pattern");
  }
  const { list, truncated } = findMatches(re, text);
  let replaced = null;
  if (replace !== "") {
    re.lastIndex = 0;
    replaced = text.replace(re, replace);
  }
  return { pattern, flags, text, replace, matches: list, truncated, replaced };
}

function sticky(re, s, i) {
  re.lastIndex = i;
  return re.test(s);
}

function quantAt(p, i) {
  QUANT.lastIndex = i;
  return QUANT.exec(p);
}

function closeAt(p, ch, i) {
  const k = p.indexOf(ch, i);
  return k < 0 ? i + 2 : k + 1;
}

function escapeEnd(p, i) {
  const d = p[i + 1];
  if (d === undefined) return i + 1;
  if (d === "x") return sticky(HEX2, p, i + 2) ? i + 4 : i + 2;
  if (d === "u") {
    if (p[i + 2] === "{") return closeAt(p, "}", i);
    return sticky(HEX4, p, i + 2) ? i + 6 : i + 2;
  }
  if (d === "c") return i + 3;
  if ((d === "p" || d === "P") && p[i + 2] === "{") return closeAt(p, "}", i);
  if (d === "k" && p[i + 2] === "<") return closeAt(p, ">", i);
  if (/[1-9]/.test(d)) {
    let j = i + 1;
    while (j < p.length && /\d/.test(p[j])) j++;
    return j;
  }
  return i + 2;
}

function escapeDesc(tok) {
  const d = tok[1];
  if (d === undefined) return "Garis miring terbalik di akhir pola";
  if (d === "0") return "Karakter NUL";
  if (/[1-9]/.test(d)) return `Mengembalikan teks grup nomor ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `Mengembalikan teks grup bernama «${tok.slice(3, -1)}»`;
  if (d === "x") return `Karakter dengan kode heksadesimal ${tok.slice(2)}`;
  if (d === "u") return `Karakter dengan kode Unicode ${tok.slice(2)}`;
  if (d === "c") return `Karakter kontrol dengan tombol Ctrl+${tok.slice(2)}`;
  if (d === "p") return `Karakter apa pun yang termasuk kategori ${tok.slice(2, -1)}`;
  if (d === "P") return `Karakter apa pun yang tidak termasuk kategori ${tok.slice(2, -1)}`;
  return `Karakter «${d}» secara harfiah (menghilangkan makna khususnya)`;
}

function classEnd(p, i) {
  let j = p[i + 1] === "^" ? i + 2 : i + 1;
  while (j < p.length && p[j] !== "]") j += p[j] === "\\" ? 2 : 1;
  return Math.min(j + 1, p.length);
}

export function explain(pattern) {
  const rows = [];
  const n = pattern.length;
  let i = 0;
  let group = 0;
  const add = (len, desc) => {
    rows.push([show(pattern.slice(i, i + len)), show(desc)]);
    i += len;
  };
  const quant = (len, desc) => {
    if (pattern[i + len] === "?") add(len + 1, `${desc}, malas (berhenti pada jumlah sekecil mungkin)`);
    else add(len, desc);
  };
  while (i < n) {
    const c = pattern[i];
    if (c === "\\") {
      const end = escapeEnd(pattern, i);
      add(end - i, escapeDesc(pattern.slice(i, end)));
    } else if (c === "[") {
      const end = classEnd(pattern, i);
      const neg = pattern[i + 1] === "^";
      const body = pattern.slice(i + (neg ? 2 : 1), end - 1);
      add(end - i, `${neg ? "karakter apa pun yang bukan salah satu dari" : "satu karakter apa pun dari"} grup [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "grup tanpa penangkapan: mengelompokkan elemen tanpa menyimpan teksnya");
      else if (pattern.startsWith("(?<=", i)) add(4, "lookbehind positif: memeriksa apakah teks di dalam grup mendahului posisi, tanpa mengonsumsi karakter");
      else if (pattern.startsWith("(?<!", i)) add(4, "lookbehind negatif: memeriksa apakah teks di dalam grup tidak mendahului posisi, tanpa mengonsumsi karakter");
      else if (pattern.startsWith("(?=", i)) add(3, "lookahead positif: memeriksa apakah teks di dalam grup mengikuti posisi, tanpa mengonsumsi karakter");
      else if (pattern.startsWith("(?!", i)) add(3, "lookahead negatif: memeriksa apakah teks di dalam grup tidak mengikuti posisi, tanpa mengonsumsi karakter");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `grup penangkapan bernama «${pattern.slice(i + 3, end - 1)}» (nomor ${group})`);
      } else {
        group += 1;
        add(1, `grup penangkapan nomor ${group}`);
      }
    } else if (c === ")") {
      add(1, "akhir grup");
    } else if (c === "*") {
      quant(1, "nol kali atau lebih");
    } else if (c === "+") {
      quant(1, "satu kali atau lebih");
    } else if (c === "?") {
      quant(1, "nol atau satu kali (opsional)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `tepat ${m[1]} kali` : m[3] === "" ? `${m[1]} kali atau lebih` : `antara ${m[1]} dan ${m[3]} kali`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "awal teks (atau awal baris dengan flag m)");
    } else if (c === "$") {
      add(1, "akhir teks (atau akhir baris dengan flag m)");
    } else if (c === ".") {
      add(1, "satu karakter apa pun kecuali baris baru (termasuk dengan flag s)");
    } else if (c === "|") {
      add(1, "alternatif: salah satu dari kedua sisi cocok");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `karakter «${ch}» secara harfiah`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "tidak cocok" : `"${show(v)}"`;
}

function groupsText(m) {
  const parts = m.groups.map((v, i) => `${i + 1}: ${valueText(v)}`);
  if (m.named) for (const [k, v] of Object.entries(m.named)) parts.push(`${k}: ${valueText(v)}`);
  return parts.length ? parts.join("، ") : "—";
}

function highlight(text, list) {
  let out = "";
  let pos = 0;
  for (const m of list) {
    if (m.text === "") continue;
    out += escapeHtml(text.slice(pos, m.index)) + `<span class="mark">${escapeHtml(m.text)}</span>`;
    pos = m.index + m.text.length;
  }
  return codeBlock(out + escapeHtml(text.slice(pos)));
}

export const meta = {
  description: "Uji ekspresi reguler (Regex) dengan sintaks JavaScript pada sebuah teks: tampilkan jumlah kecocokan beserta rinciannya dan grupnya, tandai di dalam teks, jelaskan setiap bagian pola dan arti flag-nya, serta ganti kecocokan bila diperlukan.",
  keywords: ["regex", "regular expression", "regex", "ekspresi reguler", "uji regex", "ganti", "grup", "lookahead", "lookbehind"],
  formulas: [{ label: "Bentuk ekspresi reguler", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "Pola (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "Tulis pola tanpa /, atau tulis bentuk lengkap seperti /abc/gi dan flag akan diambil darinya." },
    { id: "flags", label: "Flag (Flags)", type: "text", default: "g", help: "Dari karakter dgimsuyv, setiap flag hanya sekali." },
    { id: "text", label: "Teks", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "Teks pengganti (opsional)", type: "text", default: "", help: "Kosongkan jika tidak ingin melakukan penggantian." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["Jumlah kecocokan: 3"], note: "Contoh: mengambil angka dari teks campuran lalu menggantinya dengan simbol #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (hanya ${MAX_MATCHES} pertama)` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "Tidak ada kecocokan untuk pola ini dalam teks.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `Hanya ${MAX_MATCHES} kecocokan pertama yang ditampilkan.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "Kecocokan",
      head: ["#", "Teks yang cocok", "Posisi", "Panjang", "Grup"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "Teks dengan kecocokan ditandai:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "Teks setelah penggantian:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "Pola kosong: cocok dengan setiap posisi dalam teks." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `Pola lebih dari ${EXPLAIN_LIMIT} karakter, sehingga penjelasannya tidak ditampilkan secara rinci.` });
  else blocks.push({ type: "table", wrap: true, caption: "Penjelasan pola", head: ["Simbol", "Arti"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "Flag", head: ["Flag", "Arti"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "Tanpa flag: hanya kecocokan pertama yang ditampilkan dan huruf besar-kecil tetap dibedakan." });
  const results = [
    { label: "Jumlah kecocokan", value: countText },
    { label: "Kecocokan pertama", value: first ? `"${show(first.text)}" pada posisi ${first.index}` : "tidak ada" }
  ];
  const steps = [
    `Pola yang digunakan: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "Flag g aktif: pencarian menelusuri seluruh teks dan mengumpulkan semua kecocokan secara berurutan." : "Flag g tidak aktif: hanya kecocokan pertama yang ditampilkan.",
    `Jumlah kecocokan yang ditemukan: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`Penggantian dengan teks «${show(a.replace)}» telah diterapkan; penggantian mendukung nomor dan nama grup seperti pada JavaScript.`);
  const copy = `Jumlah kecocokan: ${countText}` + (first ? `, kecocokan pertama: "${show(first.text)}" pada posisi ${first.index}` : ", tidak ada kecocokan");
  return { results, steps, copy, blocks };
}
