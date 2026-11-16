import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHAR = (ch) => Array.from(ch);

function norm(w) {
  return w.replace(/[ً-ٰٟـ]/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

function clock(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const meta = {
  description: "Cuente palabras, caracteres, oraciones, párrafos, letras árabes y latinas, y dígitos, con el tiempo de lectura, el tiempo de exposición oral y las palabras más frecuentes.",
  keywords: ["contador de palabras", "word counter", "número de caracteres", "tiempo de lectura", "tiempo de exposición oral", "frecuencia de palabras"],
  formulas: [
    { label: "tiempo de lectura", tex: "t_r = \\frac{N_w}{v_r} \\times 60" },
    { label: "tiempo de exposición oral", tex: "t_s = \\frac{N_w}{v_s} \\times 60" }
  ],
  inputs: [
    { id: "text", label: "Texto", type: "textarea", rows: 6, placeholder: "Escriba o pegue el texto aquí", help: "Cuenta el texto en árabe e inglés a la vez." },
    { id: "readWpm", label: "Velocidad de lectura", unit: "palabras/minuto", type: "number", default: "200" },
    { id: "speakWpm", label: "Velocidad de exposición oral", unit: "palabras/minuto", type: "number", default: "130" }
  ],
  example: { values: { text: "El saber es luz y la ignorancia es oscuridad. ¡Lee al menos una página cada día!", readWpm: "200", speakWpm: "130" }, expect: ["Palabras: 16", "Caracteres: 80"], note: "Ejemplo: dos frases cortas en español." },
  invalid: { values: { text: "   ", readWpm: "200", speakWpm: "130" } },
  related: ["citation-generator", "study-planner", "gpa-calculator"]
};

export function solve(input) {
  const t = str(input, "text", "Texto").trim();
  if (t === "") fail("Introduzca un texto para contarlo.", "text");
  const readWpm = num(input, "readWpm", "Velocidad de lectura", { positive: true, max: 2000 });
  const speakWpm = num(input, "speakWpm", "Velocidad de exposición oral", { positive: true, max: 2000 });
  const words = t.split(/\s+/).filter(Boolean);
  const W = words.length;
  const chars = CHAR(t).length;
  const charsNoSpace = CHAR(t.replace(/\s/g, "")).length;
  const sentences = t.split(/[.!?؟\n]+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = t.split(/\n\s*\n/).filter((p) => p.trim() !== "").length;
  const all = CHAR(t);
  const arabic = all.filter((c) => /\p{L}/u.test(c) && /\p{Script=Arabic}/u.test(c)).length;
  const latin = all.filter((c) => /\p{L}/u.test(c) && /\p{Script=Latin}/u.test(c)).length;
  const digits = all.filter((c) => /\p{Nd}/u.test(c)).length;
  const readSec = (W / readWpm) * 60;
  const speakSec = (W / speakWpm) * 60;
  const lens = words.map(norm).filter((w) => w !== "").map((w) => CHAR(w).length);
  const avgLen = lens.length ? lens.reduce((s, n) => s + n, 0) / lens.length : 0;
  const tally = new Map();
  for (const w of words.map(norm)) {
    if (CHAR(w).length >= 3) tally.set(w, (tally.get(w) || 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, 10);
  const rs = clock(readSec), ss = clock(speakSec);
  const steps = [
    { text: "Número de palabras (separadas por espacios):", tex: `N_w = ${ntex(W, 6)}` },
    { text: "Tiempo de lectura:", tex: `t_r = \\frac{${ntex(W, 6)}}{${ntex(readWpm, 6)}} \\times 60 = ${ntex(readSec, 4)}\\ s` },
    { text: "Tiempo de exposición oral:", tex: `t_s = \\frac{${ntex(W, 6)}}{${ntex(speakWpm, 6)}} \\times 60 = ${ntex(speakSec, 4)}\\ s` }
  ];
  return {
    results: [
      { label: "Número de palabras", value: fmt(W), text: `Palabras: ${fmt(W)}` },
      { label: "Caracteres con espacios", value: fmt(chars), text: `Caracteres: ${fmt(chars)}` },
      { label: "Caracteres sin espacios", value: fmt(charsNoSpace) },
      { label: "Número de oraciones", value: fmt(sentences) },
      { label: "Número de párrafos", value: fmt(paragraphs) },
      { label: "Letras árabes", value: fmt(arabic) },
      { label: "Letras latinas", value: fmt(latin) },
      { label: "Dígitos", value: fmt(digits) },
      { label: "Tiempo de lectura (min:seg)", value: rs, text: `Tiempo de lectura: ${rs}` },
      { label: "Tiempo de exposición oral (min:seg)", value: ss, text: `Tiempo de exposición oral: ${ss}` },
      { label: "Longitud media de la palabra", value: `${fmt(avgLen, 3)} caracteres` }
    ],
    steps,
    blocks: [{ type: "table", caption: "Las 10 palabras más frecuentes (de 3 o más caracteres)", ltr: true, head: ["#", "Palabra", "Frecuencia"], rows: top.map(([w, n], i) => [String(i + 1), w, fmt(n)]) }],
    copy: `Palabras: ${fmt(W)}, caracteres: ${fmt(chars)}, tiempo de lectura: ${rs}, tiempo de exposición oral: ${ss}`,
    values: { W, chars, charsNoSpace, sentences, paragraphs, arabic, latin, digits, readSec, speakSec, avgLen, top }
  };
}
