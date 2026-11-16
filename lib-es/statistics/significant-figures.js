import { fail, str, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Cuenta las cifras significativas de cualquier medida, con la explicación de la regla para cada cero, redondea a un número dado de cifras significativas y calcula la propagación de la incertidumbre en suma, resta, multiplicación, división y potencias.",
  keywords: ["Cifras significativas", "significant figures", "sig figs", "Redondeo", "Notación científica", "Propagación del error", "Incertidumbre", "uncertainty propagation", "Error relativo", "Precisión de la medida"],
  formulas: [
    { label: "Suma y resta", tex: "q = a \\pm b \\Rightarrow \\delta q = \\sqrt{\\delta a^2 + \\delta b^2}" },
    { label: "Multiplicación, división y potencias", tex: "\\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{\\delta a}{a}\\right)^2 + \\left(\\frac{\\delta b}{b}\\right)^2},\\qquad q = a^n \\Rightarrow \\frac{\\delta q}{|q|} = |n|\\frac{\\delta a}{|a|}" }
  ],
  inputs: [
    { id: "mode", label: "Operación", type: "select", default: "count", options: [["count", "Contar cifras significativas"], ["round", "Redondear a cifras significativas"], ["prop", "Propagación del error"]] },
    { id: "value", label: "Número", type: "text", default: "0.004050", when: { mode: ["count", "round"] }, help: "Escríbelo tal como se registró en la medida, como 0.004050, 1200 o 1.20e3." },
    { id: "sf", label: "Número de cifras significativas requeridas", type: "number", default: "2", when: { mode: ["round"] } },
    { id: "op", label: "Operación aritmética", type: "select", default: "mul", options: [["add", "a + b"], ["sub", "a − b"], ["mul", "a × b"], ["div", "a ÷ b"], ["pow", "aⁿ"]], when: { mode: ["prop"] } },
    { id: "a", label: "Valor a", type: "number", default: "4.52", when: { mode: ["prop"] } },
    { id: "da", label: "Incertidumbre δa", type: "number", default: "0.02", when: { mode: ["prop"] } },
    { id: "b", label: "Valor b", type: "number", default: "2.0", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "db", label: "Incertidumbre δb", type: "number", default: "0.2", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "power", label: "Exponente n", type: "number", default: "2", when: { mode: ["prop"], op: ["pow"] } }
  ],
  example: { values: { mode: "count", value: "0.004050" }, expect: ["4 cifras significativas"], note: "Ejemplo: ¿cuántas cifras significativas tiene 0.004050?" },
  invalid: { values: { mode: "count", value: "12a" } },
  related: ["descriptive-stats", "engineering-notation", "unit-converter"]
};

function analyze(raw) {
  const s0 = normalizeDigits(raw).replace(/\s+/g, "").replace(/^\+/, "");
  const m = s0.match(/^(-?)(\d*)(\.?)(\d*)(?:[eE]([+-]?\d+))?$/);
  if (!m || (!m[2] && !m[4])) return null;
  const [, sign, ip, dot, fp, ex] = m;
  const digits = ip + fp;
  const first = digits.search(/[1-9]/);
  if (first < 0) return { zero: true, sign, ip, dot, fp, ex };
  let last = digits.length - 1;
  let ambiguous = false;
  if (!dot && !fp) {
    const t = ip.match(/0*$/)[0].length;
    if (t > 0) { ambiguous = true; last = ip.length - 1 - t; }
  }
  const sig = digits.slice(first, last + 1);
  return { sign, ip, dot, fp, ex, digits, first, last, count: sig.length, ambiguous, value: Number(s0) };
}

function roundSig(x, n) {
  if (x === 0) return "0";
  const r = Number(x.toPrecision(n));
  const e2 = Math.floor(Math.log10(Math.abs(r)));
  if (e2 >= n || e2 < -4) { const [mm, ee] = r.toExponential(n - 1).split("e"); return `${mm} × 10^${Number(ee)}`; }
  const dec = Math.max(0, n - 1 - e2);
  return r.toFixed(dec);
}

const sfWord = (n) => (n === 1 ? "una cifra significativa" : n === 2 ? "dos cifras significativas" : n <= 10 ? `${n} cifras significativas` : `${n} cifras significativas`);

function sci(x, n) {
  const [mm, ee] = x.toExponential(n - 1).split("e");
  return `${mm} × 10^${Number(ee)}`;
}

export function solve(input) {
  const mode = choice(input, "mode", "Operación", ["count", "round", "prop"], "count");
  if (mode === "prop") return propagate(input);
  const raw = str(input, "value", "Número");
  const A = analyze(raw);
  if (!A) fail("Escribe un entero como 0.00450, 1200 o 3.20e5.", "value");
  if (A.zero) fail("El número cero no tiene un número de cifras significativas definido.", "value");
  if (mode === "round") {
    const n = num(input, "sf", "Número de cifras significativas", { integer: true, min: 1, max: 15 });
    const out = roundSig(A.value, n);
    return {
      results: [{ label: `Redondeado a ${sfWord(n)}`, value: out, text: `${raw} ≈ ${out}` }, { label: "en notación científica", value: sci(A.value, n) }],
      steps: [
        `Empezamos a contar desde la primera cifra no nula (${A.digits[A.first]}) y tomamos ${n} cifras.`,
        `Miramos la cifra siguiente: si es 5 o más, aumentamos en uno la última cifra; si no, la dejamos igual.`,
        `Resultado: ${out}.`
      ],
      copy: `${raw} ≈ ${out} (${sfWord(n)})`
    };
  }
  const allDigits = A.digits;
  const rows = [...allDigits].map((d, i) => {
    let why, sig = false;
    if (i < A.first) why = "Cero inicial: solo indica la posición de la coma decimal";
    else if (i > A.last) why = "Cero final sin coma decimal: ambiguo, así que se considera no significativo";
    else if (d !== "0") { why = "Cifra no nula: siempre significativa"; sig = true; }
    else if (allDigits.slice(i).search(/[1-9]/) > 0) { why = "Cero entre cifras significativas: significativo"; sig = true; }
    else { why = "Cero final con coma decimal: significativo (indica la precisión de la medida)"; sig = true; }
    return [d, sig ? "✓" : "✗", why];
  });
  const n = A.count;
  const blocks = [{ type: "table", caption: "Veredicto para cada cifra", head: ["Cifra", "¿Significativa?", "Motivo"], rows }];
  if (A.ambiguous) blocks.push({ type: "note", tone: "warn", text: `Los ceros al final de un entero sin coma decimal son ambiguos. Escribe ${A.ip} (con punto) o usa notación científica para mostrar que son significativos.` });
  const word = sfWord(n);
  return {
    results: [
      { label: "Número de cifras significativas", value: word, text: word },
      { label: "en notación científica", value: sci(A.value, n) },
      { label: "Número de cifras decimales", value: String(A.fp.length) }
    ],
    steps: [
      "Reglas: toda cifra no nula es significativa, los ceros entre cifras significativas son significativos, los ceros iniciales no lo son, y los ceros finales solo son significativos si hay coma decimal.",
      `Para «${raw}» aplicamos las reglas a cada cifra, como se muestra en la tabla.`,
      `Total: ${word}.`,
      "Recordatorio: en suma y resta redondeamos el resultado al menor número de decimales; en multiplicación y división, al menor número de cifras significativas."
    ],
    blocks, copy: `${raw}: ${word}`
  };
}

function propagate(input) {
  const op = choice(input, "op", "Operación aritmética", ["add", "sub", "mul", "div", "pow"], "mul");
  const a = num(input, "a", "Valor a"), da = num(input, "da", "δa", { nonNegative: true });
  let q, dq, steps = [];
  if (op === "pow") {
    const n = num(input, "power", "Exponente n");
    if (a === 0 && n <= 0) fail("El cero no se puede elevar a una potencia no positiva.", "a");
    if (a < 0 && !Number.isInteger(n)) fail("Un número negativo no se puede elevar a una potencia fraccionaria.", "power");
    if (a === 0) fail("El valor a es cero, así que el error relativo no está definido.", "a");
    q = Math.pow(a, n); dq = Math.abs(q) * Math.abs(n) * (da / Math.abs(a));
    steps.push({ text: "El error relativo se multiplica por el exponente:", tex: `q = ${ntex(a)}^{${ntex(n)}} = ${ntex(q, 6)},\\quad \\frac{\\delta q}{|q|} = |${ntex(n)}| \\times \\frac{${ntex(da)}}{${ntex(Math.abs(a))}} = ${ntex(dq / Math.abs(q), 4)}` });
  } else {
    const b = num(input, "b", "Valor b"), db = num(input, "db", "δb", { nonNegative: true });
    if (op === "add" || op === "sub") {
      q = op === "add" ? a + b : a - b;
      dq = Math.sqrt(da * da + db * db);
      steps.push({ text: "En suma y resta, los errores absolutos se suman cuadráticamente:", tex: `q = ${ntex(q, 8)},\\quad \\delta q = \\sqrt{${ntex(da)}^2 + ${ntex(db)}^2} = ${ntex(dq, 4)}` });
    } else {
      if (op === "div" && b === 0) fail("No es posible dividir entre cero.", "b");
      if (a === 0 || b === 0) fail("El error relativo no está definido cuando alguno de los dos valores es cero.", a === 0 ? "a" : "b");
      q = op === "mul" ? a * b : a / b;
      const rel = Math.sqrt((da / a) ** 2 + (db / b) ** 2);
      dq = Math.abs(q) * rel;
      steps.push({ text: "En multiplicación y división, los errores relativos se suman cuadráticamente:", tex: `q = ${ntex(q, 8)},\\quad \\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{${ntex(da)}}{${ntex(a)}}\\right)^2 + \\left(\\frac{${ntex(db)}}{${ntex(b)}}\\right)^2} = ${ntex(rel, 4)}` });
    }
  }
  let shown;
  if (dq > 0) {
    const e = Math.floor(Math.log10(dq));
    const d1 = Number(dq.toPrecision(1));
    const lead = Number(String(d1).replace(/[-.0]/g, "")[0]);
    const digits = lead === 1 ? 2 : 1;
    const dqr = Number(dq.toPrecision(digits));
    const dec = Math.max(0, -(e - digits + 1));
    const qr = (Math.round(q * 10 ** dec) / 10 ** dec).toFixed(dec);
    shown = `${qr} ± ${dqr.toFixed(dec)}`;
    steps.push(`Redondeamos la incertidumbre a ${digits === 2 ? "dos cifras significativas (porque empieza por 1)" : "una cifra significativa"} y luego redondeamos el resultado a la misma posición decimal: ${shown}.`);
  } else {
    shown = `${fmt(q, 8)} ± 0`;
    steps.push("La incertidumbre es cero, así que el resultado es exacto.");
  }
  return {
    results: [
      { label: "Resultado con incertidumbre", value: shown, text: `q = ${shown}` },
      { label: "Resultado sin redondear", value: fmt(q, 8) },
      { label: "Incertidumbre absoluta δq", value: fmt(dq, 4) },
      { label: "Incertidumbre relativa", value: q !== 0 ? `${fmt((100 * dq) / Math.abs(q), 3)}%` : "Indefinido" }
    ],
    steps, copy: `q = ${shown}`
  };
}
