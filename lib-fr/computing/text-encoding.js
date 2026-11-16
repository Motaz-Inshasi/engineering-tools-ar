import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "Convertissez un texte en points de code Unicode et en octets UTF-8 en hexadécimal et en binaire, ainsi qu'en Base64 et en encodage URL, ou décodez du Base64 et de l'hexadécimal en texte, avec un tableau détaillé pour chaque caractère.",
  keywords: ["encodage", "UTF-8", "Unicode", "Base64", "hexadécimal", "hex", "URL encoding", "percent encoding", "point de code", "ASCII", "encoding"],
  formulas: [
    { label: "Point de code et octets UTF-8", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64 : chaque 3 octets (24 bits) deviennent 4 symboles de 6 bits", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "Opération", type: "select", default: "encode", options: [["encode", "Encoder le texte"], ["b64decode", "Décoder le Base64 en texte"], ["hexdecode", "Décoder l'hexadécimal en texte"]] },
    { id: "text", label: "Texte ou code", type: "textarea", default: "Hello", help: "En mode encodage, saisissez le texte. Dans les modes de décodage, saisissez uniquement le code." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "Exemple : encoder le mot Hello en Base64 et en hexadécimal." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("Le texte contient un point de code Unicode invalide (substitut isolé).", "text");
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
    fail("Code Base64 invalide : sa longueur doit être un multiple de 4, et il ne doit contenir que les caractères de l'alphabet et « = » à la fin.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("Le remplissage « = » ne doit se trouver qu'à la fin du code.", "text");
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
    fail("Code hexadécimal invalide : saisissez des paires de chiffres 0-9 et des lettres A-F.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("Les données décodées ne sont pas un texte UTF-8 valide.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(espace)";
  if (ch === "\n") return "(saut de ligne)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "Encodage de chaque caractère", head: ["Caractère", "Point de code", "Octets UTF-8", "Nombre d'octets"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Seuls les ${MAX_ROWS} premiers caractères sont affichés dans le tableau.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`Le texte dépasse ${MAX_CHARS} caractères.`, "text");
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
      { label: "Points de code (Unicode)", value: codePoints },
      { label: "Octets UTF-8 (hexadécimal)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "Encodage URL (pourcentage)", value: url },
      { label: "Binaire (octets UTF-8)", value: binary },
      { label: "Nombre de caractères et d'octets", value: `Caractères : ${chars.length}, octets : ${bytes.length}` }
    ],
    steps: [
      "Chaque caractère est d'abord converti en point de code Unicode, puis ses octets UTF-8 sont écrits.",
      { text: "Octets du texte en hexadécimal :", tex: `\\text{${hexStr}}` },
      { text: "Les 3 premiers octets sont écrits sur 24 bits, puis chaque groupe de 6 bits est lu comme un symbole de l'alphabet Base64 :", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "Si le dernier groupe ne contient qu'un ou deux octets, les bits sont complétés par des zéros et « = » remplace les symboles en trop.",
      "L'encodage URL laisse inchangés les caractères non réservés et convertit les autres octets en %XX."
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
      { label: "Texte décodé", value: text },
      { label: "Octets du code (hexadécimal)", value: hexStr },
      { label: "Nombre d'octets / de caractères", value: `${bytes.length} octets / ${Array.from(text).length} caractères` }
    ],
    steps: [
      mode === "b64decode"
        ? "Chaque groupe de 4 symboles Base64 se décode en 3 octets, et le remplissage « = » signifie un ou deux octets de moins."
        : "Chaque paire de chiffres hexadécimaux est convertie en un octet de 0 à 255.",
      "Les octets sont interprétés comme un texte UTF-8 strict ; s'ils sont invalides, la saisie est refusée au lieu d'afficher un texte corrompu."
    ],
    copy: `Texte : ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Opération", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("Saisissez le texte ou le code.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
