import { str, fail } from "../core/validate.js";
import { parseBool, truthTable, sopText, termTex } from "../core/boolean.js";

export const BOOL_HELP = "Las variables son letras latinas sueltas. AND: AB, A·B o A&B. OR: A+B. NOT: A' o !A. XOR: A^B. También se pueden escribir AND, OR, NOT y XOR como palabras.";

export const meta = {
  description: "Genera la tabla de verdad de cualquier expresión booleana de hasta 8 variables, con los minitérminos, los maxitérminos y las formas canónicas de suma de productos (SOP) y producto de sumas (POS).",
  keywords: ["Tabla de verdad", "truth table", "Álgebra de Boole", "Lógica", "minterms", "maxterms", "SOP", "POS", "Minitérminos"],
  formulas: [
    { label: "Formas canónicas", tex: "F = \\sum m(i : F_i = 1) = \\prod M(i : F_i = 0)" },
    { label: "Precedencia de operaciones", tex: "\\overline{A} \\;>\\; A\\cdot B \\;>\\; A \\oplus B \\;>\\; A + B" }
  ],
  inputs: [{ id: "expr", label: "Expresión booleana", type: "expr", default: "AB + A'C", help: BOOL_HELP }],
  example: { values: { expr: "AB + A'C" }, expect: ["Σm(1, 3, 6, 7)"], note: "Ejemplo: $F = AB + \\overline{A}C$." },
  invalid: { values: { expr: "A + (B" } },
  related: ["boolean-simplifier", "logic-gates", "binary-twos-complement"]
};

export function solve(input) {
  let tree;
  try { tree = parseBool(str(input, "expr", "Expresión")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
  const t = truthTable(tree);
  if (t.vars.length > 8) fail("El número máximo de variables es 8.", "expr");
  const n = t.vars.length;
  const bits = (m) => m.toString(2).padStart(n, "0");
  const sop = t.minterms.map((m) => bits(m));
  const posTex = t.maxterms.length ? t.maxterms.map((m) => `(${[...bits(m)].map((b, i) => (b === "0" ? t.vars[i] : `\\overline{${t.vars[i]}}`)).join(" + ")})`).join("") : "1";
  const steps = [
    `Variables: ${t.vars.join("، ") || "Ninguna (expresión constante)"}; por tanto, el número de filas es $2^{${n}} = ${1 << n}$.`,
    "Evaluamos la expresión para cada combinación respetando la precedencia: NOT, luego AND, luego XOR y luego OR (véase la tabla).",
    { text: "Las filas con salida 1 dan los minitérminos; cada minitérmino es un producto de todas las variables (la variable que vale 0 se niega):", tex: `F = ${t.minterms.length ? sop.map((b) => termTex(b, t.vars)).join(" + ") : "0"}` },
    { text: "Las filas con salida 0 dan los maxitérminos (la variable que vale 1 se niega en la suma):", tex: `F = ${posTex}` }
  ];
  const rows = t.rows.map((r) => [String(r.m), ...r.bits.map(String), { text: String(r.out), color: r.out ? "var(--accent-soft)" : "", fg: "var(--text)" }]);
  const mText = `Σm(${t.minterms.join(", ")})`, MText = `ΠM(${t.maxterms.join(", ")})`;
  return {
    results: [
      { label: "Minitérminos", value: mText, text: mText },
      { label: "Maxitérminos", value: MText },
      { label: "Suma de productos canónica", value: sopText(sop, t.vars) }
    ],
    blocks: [{ type: "table", ltr: true, caption: "Tabla de verdad", head: ["#", ...t.vars, "F"], rows }],
    steps, copy: `${mText}\n${MText}`
  };
}
