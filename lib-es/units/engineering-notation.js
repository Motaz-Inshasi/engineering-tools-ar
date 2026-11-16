import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, normalizeDigits } from "../core/format.js";

const PREFIX = [[24, "Y", "Yotta"], [21, "Z", "Zetta"], [18, "E", "Exa"], [15, "P", "Peta"], [12, "T", "Tera"], [9, "G", "Giga"], [6, "M", "Mega"], [3, "k", "Kilo"], [0, "", "—"], [-3, "m", "Mili"], [-6, "µ", "Micro"], [-9, "n", "Nano"], [-12, "p", "Pico"], [-15, "f", "Femto"], [-18, "a", "Atto"], [-21, "z", "Zepto"], [-24, "y", "Yocto"]];

export const meta = {
  description: "Convierta cualquier número a notación científica y de ingeniería (exponentes múltiplos de 3) con el prefijo adecuado (kilo, mega, mili, micro, nano…), o lea un valor con prefijo como 4.7k o 22n.",
  keywords: ["Notación de ingeniería", "engineering notation", "Notación científica", "Prefijos", "Kilo", "Mega", "mili", "Micro", "Nano", "Pico", "SI prefix"],
  formulas: [
    { label: "Notación científica y de ingeniería", tex: "x = a \\times 10^{n},\\; 1 \\le |a| < 10 \\qquad x = b \\times 10^{3k},\\; 1 \\le |b| < 1000" },
    { label: "Prefijos comunes", tex: "\\text{k} = 10^{3},\\ \\text{M} = 10^{6},\\ \\text{G} = 10^{9},\\ \\text{m} = 10^{-3},\\ \\mu = 10^{-6},\\ \\text{n} = 10^{-9},\\ \\text{p} = 10^{-12}" }
  ],
  inputs: [
    { id: "x", label: "Número", type: "text", default: "0.00047", help: "Por ejemplo 0.00047, 4.7e-4, 470u o 2.2M." },
    { id: "unit", label: "Unidad (opcional)", type: "text", default: "F" }
  ],
  example: { values: { x: "0.00047", unit: "F" }, expect: ["470 µF", "4.7 × 10^-4"], note: "Ejemplo: 0.00047 F equivale a 470 µF." },
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
  const raw = normalizeDigits(str(input, "x", "Número")).replace(/\s+/g, "");
  const x = parseNumber(raw);
  if (!isFinite(x)) fail("El valor no es un número válido. Ejemplos: 0.0047, 4.7e-3 o 4.7m.", "x");
  const unit = String(input.unit ?? "").trim().slice(0, 12);
  const sciE = x === 0 ? 0 : Math.floor(Math.log10(Math.abs(x)));
  const sciM = x === 0 ? 0 : Number((x / Math.pow(10, sciE)).toPrecision(12));
  const { mant, exp } = engParts(x);
  const p = PREFIX.find((q) => q[0] === exp);
  const steps = [
    `Valor decimal: ${fmt(x, 12)}.`,
    { text: "Notación científica: se desplaza la coma hasta dejar un único dígito distinto de cero delante:", tex: `${fmt(sciM, 12)} \\times 10^{${sciE}}` },
    { text: "Notación de ingeniería: se elige un exponente múltiplo de 3 para que el coeficiente quede entre 1 y 1000:", tex: `${fmt(mant, 12)} \\times 10^{${exp}}` },
    p ? `El exponente ${exp} corresponde al prefijo «${p[1] || "sin prefijo"}» (${p[2]}), por lo que el valor es ${fmt(mant, 12)} ${p[1]}${unit}.` : "El valor está fuera del rango de los prefijos estándar."
  ];
  const engText = p ? `${fmt(mant, 12)} ${p[1]}${unit}`.trim() : fmt(x, 12);
  return {
    results: [
      { label: "Con prefijo", value: engText, text: engText },
      { label: "Notación de ingeniería", value: `${fmt(mant, 12)} × 10^${exp}` },
      { label: "Notación científica", value: `${fmt(sciM, 12)} × 10^${sciE}`, text: `${fmt(sciM, 12)} × 10^${sciE}` },
      { label: "Decimal", value: fmt(x, 15) },
      { label: "Redondeo a cuatro cifras significativas", value: eng(x, unit, 4) }
    ],
    blocks: [{ type: "table", caption: "Tabla de prefijos", head: ["Prefijo", "Símbolo", "Valor"], rows: PREFIX.filter((q) => q[0] !== 0).map((q) => [q[2], q[1], `10^${q[0]}`]) }],
    steps, copy: `${engText} = ${fmt(sciM, 12)} × 10^${sciE}`
  };
}
