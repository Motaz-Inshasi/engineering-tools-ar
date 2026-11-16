import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "Convierte texto a puntos de código Unicode y bytes UTF-8 en hexadecimal y binario, a Base64 y a codificación URL, o decodifica Base64 y hexadecimal a texto, con una tabla detallada para cada carácter.",
  keywords: ["codificación", "UTF-8", "Unicode", "Base64", "hexadecimal", "hex", "URL encoding", "percent encoding", "punto de código", "ASCII", "encoding"],
  formulas: [
    { label: "Punto de código y bytes UTF-8", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: cada 3 bytes (24 bits) se convierten en 4 símbolos de 6 bits", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "Operación", type: "select", default: "encode", options: [["encode", "Codificar texto"], ["b64decode", "Decodificar Base64 a texto"], ["hexdecode", "Decodificar hexadecimal a texto"]] },
    { id: "text", label: "Texto o código", type: "textarea", default: "Hello", help: "En el modo de codificación introduce el texto. En los modos de decodificación introduce solo el código." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "Ejemplo: codificar la palabra Hello en Base64 y hexadecimal." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("El texto contiene un carácter Unicode no válido (sustituto aislado).", "text");
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
    fail("Código Base64 no válido: su longitud debe ser múltiplo de 4 y solo puede contener letras del alfabeto y '=' al final.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("El relleno '=' solo puede aparecer al final del código.", "text");
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
    fail("Código hexadecimal no válido: introduce pares de dígitos 0-9 y letras A-F.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("Los datos decodificados no son texto UTF-8 válido.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(espacio)";
  if (ch === "\n") return "(salto de línea)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "Codificación de cada carácter", head: ["Carácter", "Punto de código", "Bytes UTF-8", "Número de bytes"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Solo se muestran los primeros ${MAX_ROWS} caracteres en la tabla.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`El texto tiene más de ${MAX_CHARS} caracteres.`, "text");
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
      { label: "Puntos de código (Unicode)", value: codePoints },
      { label: "Bytes UTF-8 (hexadecimal)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "Codificación URL (porcentual)", value: url },
      { label: "Binario (bytes UTF-8)", value: binary },
      { label: "Número de caracteres y bytes", value: `Caracteres: ${chars.length}, bytes: ${bytes.length}` }
    ],
    steps: [
      "Cada carácter se convierte primero en un punto de código Unicode y después se escriben sus bytes UTF-8.",
      { text: "Bytes del texto en hexadecimal:", tex: `\\text{${hexStr}}` },
      { text: "Los primeros 3 bytes se escriben como 24 bits y luego cada 6 bits se leen como un símbolo del alfabeto Base64:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "Si el último grupo tiene uno o dos bytes, los bits se completan con ceros y se escribe '=' en lugar de los símbolos sobrantes.",
      "La codificación URL mantiene los caracteres no reservados tal cual y convierte el resto de bytes a %XX."
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
      { label: "Texto decodificado", value: text },
      { label: "Bytes del código (hexadecimal)", value: hexStr },
      { label: "Número de bytes / caracteres", value: `${bytes.length} bytes / ${Array.from(text).length} caracteres` }
    ],
    steps: [
      mode === "b64decode"
        ? "Cada 4 símbolos Base64 se decodifican en 3 bytes, y el relleno '=' indica uno o dos bytes menos."
        : "Cada par de dígitos hexadecimales se convierte en un byte de 0 a 255.",
      "Los bytes se interpretan como texto UTF-8 estricto; si no son válidos, la entrada se rechaza en lugar de mostrar un texto deformado."
    ],
    copy: `Texto: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Operación", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("Introduce el texto o el código.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
