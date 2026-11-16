import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Periksa teks JSON dan tentukan lokasi setiap kesalahan secara tepat (baris dan kolom) beserta penjelasan dalam bahasa Indonesia dan cara memperbaikinya. Kemudian format dengan spasi yang Anda pilih, atau padatkan dalam satu baris beserta statistik strukturnya.",
  keywords: ["JSON", "Pemeriksa JSON", "Format JSON", "Kompres JSON", "JSON formatter", "JSON validator", "Sintaks JSON"],
  formulas: [{ label: "Nilai dalam JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "Teks JSON", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "Mode", type: "select", default: "format", options: [["format", "Format"], ["minify", "Kompres dalam satu baris"], ["validate", "Validasi saja"]] },
    { id: "indent", label: "Indentasi", type: "select", default: "2", options: [["2", "2 spasi"], ["4", "4 spasi"], ["tab", "Tab"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "Urutkan kunci secara alfabetis", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"Mihsab\",\n  \"version\": 1,\n  \"tags\": [\"pendidikan\", \"teknik\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ Tidak ada kesalahan", "Kunci: 4"],
    note: "Contoh: objek JSON yang valid dengan empat kunci."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ Tidak ada kesalahan";
const VERDICT_ERR = "❌ Ditemukan 1 kesalahan";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "Objek", array: "Larik", string: "Teks", number: "Angka", boolean: "Boolean", null: "Kosong (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["Nilai «True» tidak valid dalam JSON; penulisan yang benar menggunakan huruf kecil.", "Tulis sebagai «true» dengan huruf kecil."]],
  ["False", ["Nilai «False» tidak valid dalam JSON; penulisan yang benar menggunakan huruf kecil.", "Tulis sebagai «false» dengan huruf kecil."]],
  ["None", ["Nilai «None» berasal dari Python dan bukan nilai JSON.", "Tulis sebagai «null» dengan huruf kecil."]],
  ["undefined", ["Nilai «undefined» berasal dari JavaScript dan bukan nilai JSON.", "Tulis sebagai «null»."]],
  ["NaN", ["Nilai «NaN» tidak diizinkan dalam JSON.", "Gunakan «null», atau tulis nilai sebagai teks di antara tanda kutip."]],
  ["Infinity", ["Nilai «Infinity» tidak diizinkan dalam JSON.", "Gunakan «null», atau tulis nilai sebagai teks di antara tanda kutip."]]
]);

class JsonProblem extends Error {
  constructor(pos, len, message, suggestion) {
    super(message);
    this.pos = pos;
    this.len = len;
    this.suggestion = suggestion;
  }
}

function fault(pos, len, message, suggestion) {
  throw new JsonProblem(pos, len, message, suggestion);
}

function locate(src, pos) {
  let line = 1, start = 0;
  for (let k = 0; k < pos; k++) if (src[k] === "\n") { line++; start = k + 1; }
  return { line, col: pos - start + 1 };
}

function where(src, pos) {
  const l = locate(src, pos);
  return `Baris ${l.line} (kolom ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `«${ch}» yang dibuka di ${where(s, open)} belum ditutup sebelum akhir berkas.`, `Tambahkan «${close}» di tempat yang sesuai untuk menutupnya.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON tidak mendukung komentar, dan ini adalah komentar yang dimulai di sini.", "Hapus komentar sepenuhnya; berkas JSON tidak boleh memuat komentar apa pun.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON tidak mendukung komentar, dan ini adalah komentar multibaris yang dimulai di sini.", "Hapus komentar sepenuhnya; berkas JSON tidak boleh memuat komentar apa pun.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "Tanda kutip ganda yang memulai teks belum ditutup.", "Tambahkan \" di akhir teks, dan jangan lanjutkan teks ke baris lain.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "Tanda kutip ganda yang memulai teks belum ditutup.", "Tambahkan \" di akhir teks, dan jangan lanjutkan teks ke baris lain.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "Urutan escape \\u harus diikuti empat digit heksadesimal (0-9 atau A-F).", "Contoh yang benar: \\u00e9 mewakili karakter é.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `Urutan escape «\\${e}» tidak valid dalam JSON.`, "Karakter yang diizinkan setelah garis miring terbalik \\ adalah: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "Karakter kontrol tidak diizinkan di dalam teks (seperti Tab atau karakter tak terlihat).", "Ganti dengan urutan escape seperti \\t, atau hapus.");
    value += c;
    i++;
  }
}

function parseNumber(st) {
  const s = st.s, start = st.i;
  let i = start;
  if (s[i] === "-") i++;
  if (s[i] === "0") {
    i++;
    if (digit(s[i])) {
      let k = i;
      while (digit(s[k])) k++;
      fault(start, k - start, "Angka dalam JSON tidak boleh diawali nol yang diikuti digit.", "Hapus nol berlebih di awal angka; misalnya, 01 menjadi 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "Tanda «-» harus diikuti oleh angka.", "Tulis angka setelah «-», seperti -5, atau hapus tanda jika itu kesalahan.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "Tanda titik desimal harus diikuti oleh angka.", "Tulis angka setelah titik, seperti 1.5, atau hapus titiknya.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "Eksponen pada angka ilmiah harus diikuti oleh angka.", "Contoh yang benar: 1e5 atau 2.5E-3.");
    while (digit(s[i])) i++;
  }
  st.i = i;
  return { type: "number", raw: s.slice(start, i) };
}

function parseWord(st) {
  const s = st.s, start = st.i, end = wordEnd(s, start);
  const w = s.slice(start, end);
  st.i = end;
  if (w === "true" || w === "false") return { type: "boolean", raw: w };
  if (w === "null") return { type: "null", raw: w };
  if (LITERAL_HINTS.has(w)) {
    const [message, suggestion] = LITERAL_HINTS.get(w);
    fault(start, w.length, message, suggestion);
  }
  fault(start, w.length, `Kata «${w}» bukan nilai JSON yang valid.`, "Nilai yang diizinkan: teks di antara \"\", angka, true, false, atau null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "Koma berlebih sebelum «}».", "Hapus koma terakhir sebelum kurung kurawal «}».");
  if (c === "'") fault(st.i, 1, "Nama kunci harus diapit tanda kutip ganda, bukan tanda kutip tunggal.", "Ganti ' dengan \" di sekitar nama kunci.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `Nama kunci «${w}» tidak diapit tanda kutip.`, `Tulis nama di antara tanda kutip ganda: "${w}".`);
  }
  fault(st.i, 1, `Nama kunci harus berupa teks di antara tanda kutip ganda, tetapi yang ditemukan adalah «${c}».`, "Tulis nama kunci di antara tanda kutip ganda.");
}

function parseObject(st) {
  const s = st.s, open = st.i;
  st.i++;
  const entries = [];
  skipSpace(st);
  if (s[st.i] === "}") {
    st.i++;
    return { type: "object", entries };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    const key = parseKey(st);
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    if (s[st.i] !== ":") fault(st.i, 1, `Diharapkan titik dua «:» setelah nama kunci, tetapi yang ditemukan adalah «${s[st.i]}».`, "Tulis «:» di antara nama kunci dan nilai, misalnya: \"name\": \"value\".");
    st.i++;
    entries.push({ key: key.value, raw: key.raw, value: parseValue(st) });
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "}") {
      st.i++;
      return { type: "object", entries };
    }
    if (d === undefined) unclosed(s, open, "{", "}");
    if (d === "]") fault(st.i, 1, `Ditemukan «]» padahal yang diharapkan «}» untuk menutup «{» yang dibuka di ${where(s, open)}.`, "Jika ini adalah akhir objek, ganti «]» dengan «}»; jika tidak, periksa kurungnya.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Diharapkan koma «,» di antara anggota objek, tetapi anggota baru langsung dimulai.", "Tambahkan koma «,» setelah nilai sebelumnya.");
    fault(st.i, 1, `Diharapkan «,» atau «}», tetapi yang ditemukan adalah «${d}».`, "Periksa koma dan kurung di sekitar posisi ini.");
  }
}

function parseArray(st) {
  const s = st.s, open = st.i;
  st.i++;
  const items = [];
  skipSpace(st);
  if (s[st.i] === "]") {
    st.i++;
    return { type: "array", items };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "[", "]");
    if (s[st.i] === "]") fault(st.i, 1, "Koma berlebih sebelum «]».", "Hapus koma terakhir sebelum kurung siku «]».");
    items.push(parseValue(st));
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "]") {
      st.i++;
      return { type: "array", items };
    }
    if (d === undefined) unclosed(s, open, "[", "]");
    if (d === "}") fault(st.i, 1, `Ditemukan «}» padahal yang diharapkan «]» untuk menutup «[» yang dibuka di ${where(s, open)}.`, "Jika ini adalah akhir larik, ganti «}» dengan «]»; jika tidak, periksa kurungnya.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Diharapkan koma «,» di antara elemen larik, tetapi elemen baru langsung dimulai.", "Tambahkan koma «,» di antara dua elemen.");
    fault(st.i, 1, `Diharapkan «,» atau «]», tetapi yang ditemukan adalah «${d}».`, "Periksa koma dan kurung di sekitar posisi ini.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "Berkas berakhir padahal di sini diharapkan sebuah nilai.", "Lengkapi nilai yang hilang, atau hapus koma atau titik dua sebelumnya.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "Teks dalam JSON ditulis dengan tanda kutip ganda \", dan tanda kutip tunggal ' tidak diizinkan.", "Ganti ' dengan \" di awal dan akhir teks.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `Diharapkan sebuah nilai di sini, tetapi yang ditemukan adalah «${c}».`, "Nilai yang diizinkan: teks di antara \"\", angka, true, false, null, objek {}, atau larik [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `Kurung tutup «${c}» berlebih dan tidak memiliki kurung buka yang sesuai.`, "Hapus, atau pastikan setiap kurung buka memiliki kurung tutup yang sesuai.");
      fault(st.i, 1, "Ada konten berlebih setelah akhir nilai utama.", "Berkas JSON hanya boleh berisi satu nilai; letakkan item di dalam larik [ ] atau objek { }.");
    }
    return { ok: true, tree };
  } catch (e) {
    if (!(e instanceof JsonProblem)) throw e;
    const at = locate(src, e.pos);
    return { ok: false, problem: { pos: e.pos, len: e.len, line: at.line, col: at.col, message: e.message, suggestion: e.suggestion } };
  }
}

export function formatJson(tree, mode, unit, sortKeys) {
  return serialize(tree, mode === "minify" ? null : unit, sortKeys, 0);
}

function serialize(node, unit, sortKeys, level) {
  if (node.type === "object") {
    if (node.entries.length === 0) return "{}";
    let entries = node.entries;
    if (sortKeys) entries = entries.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    if (unit === null) return "{" + entries.map((e) => e.raw + ":" + serialize(e.value, null, sortKeys, 0)).join(",") + "}";
    const pad = unit.repeat(level + 1);
    return "{\n" + entries.map((e) => pad + e.raw + ": " + serialize(e.value, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "}";
  }
  if (node.type === "array") {
    if (node.items.length === 0) return "[]";
    if (unit === null) return "[" + node.items.map((x) => serialize(x, null, sortKeys, 0)).join(",") + "]";
    const pad = unit.repeat(level + 1);
    return "[\n" + node.items.map((x) => pad + serialize(x, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "]";
  }
  return node.raw;
}

function measure(node, depth, acc) {
  acc.values++;
  if (node.type !== "object" && node.type !== "array") return;
  const d = depth + 1;
  if (d > acc.maxDepth) acc.maxDepth = d;
  if (node.type === "object") {
    acc.keys += node.entries.length;
    for (const e of node.entries) measure(e.value, d, acc);
  } else {
    for (const x of node.items) measure(x, d, acc);
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderLine(text, ranges) {
  const bad = new Array(text.length).fill(false);
  let tail = false;
  for (const [a, b] of ranges) {
    if (a >= text.length) tail = true;
    for (let k = a; k < Math.min(b, text.length); k++) bad[k] = true;
  }
  let html = "";
  let k = 0;
  while (k < text.length) {
    const flag = bad[k];
    let j = k;
    while (j < text.length && bad[j] === flag) j++;
    const chunk = esc(text.slice(k, j));
    html += flag ? `<span class="bad">${chunk}</span>` : chunk;
    k = j;
  }
  if (tail) html += "<span class=\"bad\"> </span>";
  return html;
}

function snippet(src, problems) {
  const lines = src.split("\n");
  const shown = new Set();
  const marks = new Map();
  for (const p of problems) {
    for (let n = Math.max(1, p.line - CONTEXT); n <= Math.min(lines.length, p.line + CONTEXT); n++) shown.add(n);
    if (!marks.has(p.line)) marks.set(p.line, []);
    marks.get(p.line).push([p.col - 1, p.col - 1 + Math.max(1, p.len || 0)]);
  }
  const out = [];
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (prev && n !== prev + 1) out.push("…");
    out.push(`<span class="ln">${n}</span>${renderLine(lines[n - 1] ?? "", marks.get(n) || [])}`);
    prev = n;
  }
  return `<pre class="code" dir="ltr"><code>${out.join("\n")}</code></pre>`;
}

function errorResult(src, problem, length) {
  const at = `Baris ${problem.line}, kolom ${problem.col}`;
  return {
    results: [
      { label: "Hasil", value: VERDICT_ERR },
      { label: "Lokasi kesalahan", value: at },
      { label: "Ukuran sebelum", value: `${length} karakter` }
    ],
    steps: [`Buka ${at}.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["Baris", "Kolom", "Masalah", "Cara memperbaiki"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
Cara memperbaiki: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Masukkan teks JSON yang ingin Anda periksa.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("Teks lebih dari 200000 karakter; kurangi ukurannya lalu periksa kembali.", "text");
  const mode = choice(input, "mode", "Mode", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "Indentasi", ["2", "4", "tab"], "2");
  const sortKeys = !isBlank(input.sortKeys) && String(input.sortKeys) !== "0";
  const src = text.replace(/\r\n?/g, "\n");
  const parsed = parseJson(src);
  if (!parsed.ok) return errorResult(src, parsed.problem, text.length);
  const tree = parsed.tree;
  const acc = { values: 0, keys: 0, maxDepth: 0 };
  measure(tree, 0, acc);
  const output = mode === "validate" ? "" : formatJson(tree, mode, INDENTS[indent], sortKeys);
  const rootLabel = ROOT_TYPES[tree.type];
  const results = [
    { label: "Hasil", value: VERDICT_OK },
    { label: "Jenis nilai akar", value: rootLabel },
    { label: "Jumlah kunci", value: String(acc.keys) },
    { label: "Jumlah nilai", value: String(acc.values) },
    { label: "Kedalaman maksimum", value: String(acc.maxDepth) },
    { label: "Ukuran sebelum", value: `${text.length} karakter` }
  ];
  const blocks = [];
  let step = "Tidak ada format yang diminta, jadi hanya pemeriksaan yang dilakukan.";
  if (output) {
    results.push({ label: "Ukuran sesudah", value: `${output.length} karakter` });
    blocks.push({ type: "note", text: mode === "minify" ? "Hasil dikompres dalam satu baris:" : "Hasil setelah diformat:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "Menghapus spasi dan baris kosong di luar teks." : "Berkas ditulis ulang dengan setiap level dalam diindentasi.";
  }
  const summary = `${VERDICT_OK}. Jenis nilai akar: ${rootLabel}, kunci: ${acc.keys}, nilai: ${acc.values}, kedalaman maksimum: ${acc.maxDepth}, ukuran: ${text.length} karakter`;
  return {
    results,
    steps: ["Teks dibaca dan strukturnya dianalisis karakter demi karakter sesuai aturan JSON.", "Diperiksa bahwa kunci berada di antara tanda kutip, dan koma serta kurung seimbang.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
