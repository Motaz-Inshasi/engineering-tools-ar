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
  description: "Calculez le nombre de mots, de caractères, de phrases, de paragraphes, de lettres arabes et latines et de chiffres, avec le temps de lecture, le temps d'élocution et les mots les plus fréquents.",
  keywords: ["Compteur de mots", "word counter", "Nombre de caractères", "temps de lecture", "temps d'élocution", "fréquence des mots"],
  formulas: [
    { label: "temps de lecture", tex: "t_r = \\frac{N_w}{v_r} \\times 60" },
    { label: "temps d'élocution", tex: "t_s = \\frac{N_w}{v_s} \\times 60" }
  ],
  inputs: [
    { id: "text", label: "Texte", type: "textarea", rows: 6, placeholder: "Saisissez ou collez le texte ici", help: "Compte le texte en arabe et en anglais ensemble." },
    { id: "readWpm", label: "Vitesse de lecture", unit: "mots/min", type: "number", default: "200" },
    { id: "speakWpm", label: "Vitesse d'élocution", unit: "mots/min", type: "number", default: "130" }
  ],
  example: { values: { text: "Le savoir est lumière et l'ignorance est ténèbres. Lisez au moins une page par jour.", readWpm: "200", speakWpm: "130" }, expect: ["Mots : 15", "Caractères : 84"], note: "Exemple : deux courtes phrases en français." },
  invalid: { values: { text: "   ", readWpm: "200", speakWpm: "130" } },
  related: ["citation-generator", "study-planner", "gpa-calculator"]
};

export function solve(input) {
  const t = str(input, "text", "Texte").trim();
  if (t === "") fail("Saisissez un texte à compter.", "text");
  const readWpm = num(input, "readWpm", "Vitesse de lecture", { positive: true, max: 2000 });
  const speakWpm = num(input, "speakWpm", "Vitesse d'élocution", { positive: true, max: 2000 });
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
    { text: "Nombre de mots (séparés par des espaces) :", tex: `N_w = ${ntex(W, 6)}` },
    { text: "Temps de lecture :", tex: `t_r = \\frac{${ntex(W, 6)}}{${ntex(readWpm, 6)}} \\times 60 = ${ntex(readSec, 4)}\\ s` },
    { text: "Temps d'élocution :", tex: `t_s = \\frac{${ntex(W, 6)}}{${ntex(speakWpm, 6)}} \\times 60 = ${ntex(speakSec, 4)}\\ s` }
  ];
  return {
    results: [
      { label: "Nombre de mots", value: fmt(W), text: `Mots : ${fmt(W)}` },
      { label: "Caractères avec espaces", value: fmt(chars), text: `Caractères : ${fmt(chars)}` },
      { label: "Caractères sans espaces", value: fmt(charsNoSpace) },
      { label: "Nombre de phrases", value: fmt(sentences) },
      { label: "Nombre de paragraphes", value: fmt(paragraphs) },
      { label: "Lettres arabes", value: fmt(arabic) },
      { label: "Lettres latines", value: fmt(latin) },
      { label: "Chiffres", value: fmt(digits) },
      { label: "Temps de lecture (min:s)", value: rs, text: `Temps de lecture : ${rs}` },
      { label: "Temps d'élocution (min:s)", value: ss, text: `Temps d'élocution : ${ss}` },
      { label: "Longueur moyenne d'un mot", value: `${fmt(avgLen, 3)} caractères` }
    ],
    steps,
    blocks: [{ type: "table", caption: "10 mots les plus fréquents (3 caractères ou plus)", ltr: true, head: ["#", "Mot", "Fréquence"], rows: top.map(([w, n], i) => [String(i + 1), w, fmt(n)]) }],
    copy: `Mots : ${fmt(W)}, caractères : ${fmt(chars)}, temps de lecture : ${rs}, temps d'élocution : ${ss}`,
    values: { W, chars, charsNoSpace, sentences, paragraphs, arabic, latin, digits, readSec, speakSec, avgLen, top }
  };
}
