import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, normalizeDigits } from "../core/format.js";

const PREFIX = [[24, "Y", "yotta"], [21, "Z", "zetta"], [18, "E", "exa"], [15, "P", "peta"], [12, "T", "tera"], [9, "G", "giga"], [6, "M", "mega"], [3, "k", "kilo"], [0, "", "—"], [-3, "m", "milli"], [-6, "µ", "micro"], [-9, "n", "nano"], [-12, "p", "pico"], [-15, "f", "femto"], [-18, "a", "atto"], [-21, "z", "zepto"], [-24, "y", "yocto"]];

export const meta = {
  description: "Convert any number to scientific notation and engineering notation (exponents that are multiples of 3) with the appropriate prefix (kilo, mega, milli, micro, nano…), or read a value written with a prefix such as 4.7k or 22n.",
  keywords: ["Engineering notation", "engineering notation", "Scientific notation", "Prefixes", "kilo", "mega", "milli", "micro", "nano", "pico", "SI prefix"],
  formulas: [
    { label: "Scientific and engineering notation", tex: "x = a \\times 10^{n},\\; 1 \\le |a| < 10 \\qquad x = b \\times 10^{3k},\\; 1 \\le |b| < 1000" },
    { label: "Common prefixes", tex: "\\text{k} = 10^{3},\\ \\text{M} = 10^{6},\\ \\text{G} = 10^{9},\\ \\text{m} = 10^{-3},\\ \\mu = 10^{-6},\\ \\text{n} = 10^{-9},\\ \\text{p} = 10^{-12}" }
  ],
  inputs: [
    { id: "x", label: "Number", type: "text", default: "0.00047", help: "For example: 0.00047, 4.7e-4, 470u or 2.2M." },
    { id: "unit", label: "Unit (optional)", type: "text", default: "F" }
  ],
  example: { values: { x: "0.00047", unit: "F" }, expect: ["470 µF", "4.7 × 10^-4"], note: "Example: 0.00047 F is 470 µF." },
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
  const raw = normalizeDigits(str(input, "x", "Number")).replace(/\s+/g, "");
  const x = parseNumber(raw);
  if (!isFinite(x)) fail("The value is not a valid number. Examples: 0.0047, 4.7e-3 or 4.7m.", "x");
  const unit = String(input.unit ?? "").trim().slice(0, 12);
  const sciE = x === 0 ? 0 : Math.floor(Math.log10(Math.abs(x)));
  const sciM = x === 0 ? 0 : Number((x / Math.pow(10, sciE)).toPrecision(12));
  const { mant, exp } = engParts(x);
  const p = PREFIX.find((q) => q[0] === exp);
  const steps = [
    `Decimal value: ${fmt(x, 12)}.`,
    { text: "Scientific notation: move the decimal point until one non-zero digit remains before it:", tex: `${fmt(sciM, 12)} \\times 10^{${sciE}}` },
    { text: "Engineering notation: choose an exponent that is a multiple of 3 so that the coefficient is between 1 and 1000:", tex: `${fmt(mant, 12)} \\times 10^{${exp}}` },
    p ? `The exponent ${exp} corresponds to the prefix “${p[1] || "no prefix"}” (${p[2]}), so the value is ${fmt(mant, 12)} ${p[1]}${unit}.` : "The value is outside the range of standard prefixes."
  ];
  const engText = p ? `${fmt(mant, 12)} ${p[1]}${unit}`.trim() : fmt(x, 12);
  return {
    results: [
      { label: "With prefix", value: engText, text: engText },
      { label: "Engineering notation", value: `${fmt(mant, 12)} × 10^${exp}` },
      { label: "Scientific notation", value: `${fmt(sciM, 12)} × 10^${sciE}`, text: `${fmt(sciM, 12)} × 10^${sciE}` },
      { label: "Decimal", value: fmt(x, 15) },
      { label: "Rounded to four significant figures", value: eng(x, unit, 4) }
    ],
    blocks: [{ type: "table", caption: "Prefix table", head: ["Prefix", "Symbol", "Value"], rows: PREFIX.filter((q) => q[0] !== 0).map((q) => [q[2], q[1], `10^${q[0]}`]) }],
    steps, copy: `${engText} = ${fmt(sciM, 12)} × 10^${sciE}`
  };
}
