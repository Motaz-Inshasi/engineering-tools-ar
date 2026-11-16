import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, normalizeDigits } from "../core/format.js";

const PREFIX = [[24, "Y", "yotta"], [21, "Z", "zetta"], [18, "E", "exa"], [15, "P", "péta"], [12, "T", "téra"], [9, "G", "giga"], [6, "M", "méga"], [3, "k", "kilo"], [0, "", "—"], [-3, "m", "milli"], [-6, "µ", "micro"], [-9, "n", "nano"], [-12, "p", "pico"], [-15, "f", "femto"], [-18, "a", "atto"], [-21, "z", "zepto"], [-24, "y", "yocto"]];

export const meta = {
  description: "Convertissez tout nombre en notation scientifique et en notation d'ingénieur (exposants multiples de 3) avec le préfixe approprié (kilo, méga, milli, micro, nano…), ou lisez une valeur écrite avec un préfixe comme 4.7k ou 22n.",
  keywords: ["Notation d'ingénieur", "engineering notation", "Notation scientifique", "préfixes", "kilo", "méga", "milli", "micro", "nano", "pico", "SI prefix"],
  formulas: [
    { label: "Notation scientifique et d'ingénieur", tex: "x = a \\times 10^{n},\\; 1 \\le |a| < 10 \\qquad x = b \\times 10^{3k},\\; 1 \\le |b| < 1000" },
    { label: "Préfixes courants", tex: "\\text{k} = 10^{3},\\ \\text{M} = 10^{6},\\ \\text{G} = 10^{9},\\ \\text{m} = 10^{-3},\\ \\mu = 10^{-6},\\ \\text{n} = 10^{-9},\\ \\text{p} = 10^{-12}" }
  ],
  inputs: [
    { id: "x", label: "Nombre", type: "text", default: "0.00047", help: "Par exemple 0.00047, 4.7e-4, 470u ou 2.2M." },
    { id: "unit", label: "Unité (facultatif)", type: "text", default: "F" }
  ],
  example: { values: { x: "0.00047", unit: "F" }, expect: ["470 µF", "4.7 × 10^-4"], note: "Exemple : 0.00047 F correspond à 470 µF." },
  invalid: { values: { x: "12abc" } },
  related: ["unit-converter", "standard-resistor-values", "resistor-color-code"]
};

export function engParts(x) {
  if (x === 0) return { mant: 0, exp: 0 };
  let e = Math.floor(Math.log10(Math.abs(x)) / 3) * 3;
  let m = x / Math.pow(10, e);
  if (Math.abs(Number(m.toPrecision(12))) >= 1000) { e += 3; m /= 1000; }
  return { mant: Number(m.toPrecision(12)), exp: e === 0 ? 0 : e };
}

export function solve(input) {
  const raw = normalizeDigits(str(input, "x", "Nombre")).replace(/\s+/g, "");
  const x = parseNumber(raw);
  if (!isFinite(x)) fail("La valeur n'est pas un nombre entier. Exemples : 0.0047, 4.7e-3 ou 4.7m.", "x");
  const unit = String(input.unit ?? "").trim().slice(0, 12);
  const sciE = x === 0 ? 0 : Math.floor(Math.log10(Math.abs(x)));
  const sciM = x === 0 ? 0 : Number((x / Math.pow(10, sciE)).toPrecision(12));
  const { mant, exp } = engParts(x);
  const p = PREFIX.find((q) => q[0] === exp);
  const steps = [
    `Valeur décimale : ${fmt(x, 12)}.`,
    { text: "Notation scientifique : on déplace la virgule jusqu'à ce qu'il ne reste qu'un chiffre non nul avant elle :", tex: `${fmt(sciM, 12)} \\times 10^{${sciE}}` },
    { text: "Notation d'ingénieur : on choisit un exposant multiple de 3 pour que le coefficient soit compris entre 1 et 1000 :", tex: `${fmt(mant, 12)} \\times 10^{${exp}}` },
    p ? `L'exposant ${exp} correspond au préfixe « ${p[1] || "sans préfixe"} » (${p[2]}), donc la valeur est ${fmt(mant, 12)} ${p[1]}${unit}.` : "La valeur est hors de la plage des préfixes standard."
  ];
  const engText = p ? `${fmt(mant, 12)} ${p[1]}${unit}`.trim() : fmt(x, 12);
  return {
    results: [
      { label: "Avec préfixe", value: engText, text: engText },
      { label: "Notation d'ingénieur", value: `${fmt(mant, 12)} × 10^${exp}` },
      { label: "Notation scientifique", value: `${fmt(sciM, 12)} × 10^${sciE}`, text: `${fmt(sciM, 12)} × 10^${sciE}` },
      { label: "Décimal", value: fmt(x, 15) },
      { label: "Arrondi à quatre chiffres significatifs", value: eng(x, unit, 4) }
    ],
    blocks: [{ type: "table", caption: "Tableau des préfixes", head: ["Préfixe", "Symbole", "Valeur"], rows: PREFIX.filter((q) => q[0] !== 0).map((q) => [q[2], q[1], `10^${q[0]}`]) }],
    steps, copy: `${engText} = ${fmt(sciM, 12)} × 10^${sciE}`
  };
}
