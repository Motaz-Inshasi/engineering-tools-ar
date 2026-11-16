import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "Ubah teks menjadi titik kode Unicode dan byte UTF-8 dalam heksadesimal dan biner, serta pengkodean Base64 dan URL, atau dekode Base64 dan heksadesimal kembali menjadi teks, dengan tabel rinci untuk setiap karakter.",
  keywords: ["pengkodean", "UTF-8", "Unicode", "Base64", "heksadesimal", "hex", "URL encoding", "percent encoding", "titik kode", "ASCII", "encoding"],
  formulas: [
    { label: "Titik kode dan byte UTF-8", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: setiap 3 byte (24 bit) menjadi 4 simbol masing-masing 6 bit", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "Operasi", type: "select", default: "encode", options: [["encode", "Kodekan teks"], ["b64decode", "Dekode Base64 menjadi teks"], ["hexdecode", "Dekode heksadesimal menjadi teks"]] },
    { id: "text", label: "Teks atau kode", type: "textarea", default: "Hello", help: "Dalam mode pengkodean, masukkan teks. Dalam mode dekode, masukkan kode saja." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "Contoh: mengkodekan kata Hello menjadi Base64 dan heksadesimal." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("Teks mengandung karakter Unicode yang tidak valid (surrogate tunggal).", "text");
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

export function base64Encode(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const rem = Math.min(3, bytes.length - i);
    const n = (bytes[i] << 16) | ((rem > 1 ? bytes[i + 1] : 0) << 8) | (rem > 2 ? bytes[i + 2] : 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (rem > 1 ? B64[(n >> 6) & 63] : "=") + (rem > 2 ? B64[n & 63] : "=");
  }
  return out;
}

export function base64Decode(code) {
  if (code === "" || code.length % 4 !== 0 || !/^[A-Za-z0-9+\/]*={0,2}$/.test(code)) {
    fail("Kode Base64 tidak valid: panjangnya harus kelipatan 4, dan hanya boleh berisi huruf abjad serta '=' di akhir.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("Padding '=' hanya boleh berada di akhir kode.", "text");
    let n = 0;
    for (let j = 0; j < 4; j++) n = (n << 6) | (j < 4 - pad ? B64.indexOf(chunk[j]) : 0);
    out.push((n >> 16) & 255);
    if (pad < 2) out.push((n >> 8) & 255);
    if (pad < 1) out.push(n & 255);
  }
  return out;
}

export function hexToBytes(code) {
  const t = code.replace(/0x/gi, "").replace(/,/g, "");
  if (t === "" || !/^[0-9A-Fa-f]+$/.test(t) || t.length % 2 !== 0) {
    fail("Kode heksadesimal tidak valid: masukkan pasangan digit 0-9 dan huruf A-F.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("Data hasil dekode bukan teks UTF-8 yang valid.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(spasi)";
  if (ch === "\n") return "(baris baru)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "Pengkodean setiap karakter", head: ["Karakter", "Titik kode", "Byte UTF-8", "Jumlah byte"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Hanya ${MAX_ROWS} karakter pertama yang ditampilkan di tabel.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`Teks lebih panjang dari ${MAX_CHARS} karakter.`, "text");
  const bytes = utf8Bytes(text);
  const codePoints = chars.map((ch) => `U+${hex(ch.codePointAt(0), 4)}`).join(" ");
  const hexStr = bytes.map((b) => hex(b, 2)).join(" ");
  const b64 = base64Encode(bytes);
  const url = encodeURIComponent(text);
  const binary = bytes.map((b) => b.toString(2).padStart(8, "0")).join(" ");
  const bits = bytes.slice(0, 3).map((b) => b.toString(2).padStart(8, "0")).join("").padEnd(24, "0");
  const groups = bits.match(/.{6}/g);
  const letters = groups.map((g) => B64[parseInt(g, 2)]).join(" ");
  return {
    results: [
      { label: "Titik kode (Unicode)", value: codePoints },
      { label: "Byte UTF-8 (heksadesimal)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "Pengkodean URL (persen)", value: url },
      { label: "Biner (byte UTF-8)", value: binary },
      { label: "Jumlah karakter dan byte", value: `Karakter: ${chars.length}, byte: ${bytes.length}` }
    ],
    steps: [
      "Setiap karakter pertama-tama diubah menjadi titik kode Unicode, lalu byte UTF-8-nya dituliskan.",
      { text: "Byte teks dalam heksadesimal:", tex: `\\text{${hexStr}}` },
      { text: "3 byte pertama dituliskan sebagai 24 bit, lalu setiap 6 bit dibaca sebagai satu simbol dari abjad Base64:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "Jika kelompok terakhir berisi satu atau dua byte, bit diisi nol dan '=' dituliskan menggantikan simbol tambahan.",
      "Pengkodean URL mempertahankan karakter yang tidak dicadangkan apa adanya dan mengubah byte lainnya menjadi %XX."
    ],
    copy: `Base64: ${b64} | HEX: ${hexStr}`,
    blocks: charBlocks(text)
  };
}

function decodeMode(bytes, mode) {
  const text = decodeUtf8(bytes);
  const hexStr = bytes.map((b) => hex(b, 2)).join(" ");
  return {
    results: [
      { label: "Teks hasil dekode", value: text },
      { label: "Byte kode (heksadesimal)", value: hexStr },
      { label: "Jumlah byte / karakter", value: `${bytes.length} byte / ${Array.from(text).length} karakter` }
    ],
    steps: [
      mode === "b64decode"
        ? "Setiap 4 simbol Base64 didekode menjadi 3 byte, dan padding '=' berarti satu atau dua byte lebih sedikit."
        : "Setiap pasangan digit heksadesimal diubah menjadi satu byte dari 0 hingga 255.",
      "Byte ditafsirkan sebagai teks UTF-8 yang ketat; jika tidak valid, masukan ditolak daripada menampilkan teks yang rusak."
    ],
    copy: `Teks: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Operasi", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("Masukkan teks atau kode.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
