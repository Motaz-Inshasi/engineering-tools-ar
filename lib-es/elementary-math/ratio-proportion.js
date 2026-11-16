import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "Simplifica una razón a números enteros en su forma más sencilla, resuelve la proporción a/b = c/d para hallar el término desconocido, reparte una cantidad en una razón dada y resuelve problemas de proporcionalidad directa e inversa, con los pasos.",
  keywords: ["razón", "proporción", "ratio", "proportion", "reparto en razón", "proporcionalidad directa", "proporcionalidad inversa", "resolver una proporción"],
  formulas: [
    { label: "Proporcionalidad directa", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "Proporcionalidad inversa", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "Proporción a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de problema", type: "select", default: "simplify", options: [["simplify", "Simplificar una razón a números enteros"], ["solve", "Resolver una proporción a/b = c/d (término desconocido)"], ["divide", "Repartir una cantidad en una razón dada"], ["direct", "proporcionalidad directa"], ["inverse", "proporcionalidad inversa"]] },
    { id: "ratio", label: "Razón a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "De 2 a 5 partes separadas por dos puntos; se admite un número decimal." },
    { id: "total", label: "Cantidad total", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "Término a", type: "number", default: "2", when: { mode: ["solve"] }, help: "En la proporción a resolver, deja vacío solo un término." },
    { id: "b", label: "Término b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "Término c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "Término d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "Primer valor x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "Ejemplo: 5 trabajadores." },
    { id: "y1", label: "Valor correspondiente y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "Ejemplo: 12 días." },
    { id: "x2", label: "Segundo valor x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "Ejemplo: 6 trabajadores; el resultado y₂ es la incógnita." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "Ejemplo: 5 trabajadores terminan el trabajo en 12 días; ¿cuántos días necesitan 6 trabajadores? (proporcionalidad inversa)"
  },
  invalid: { values: { mode: "solve", a: "2", b: "", c: "4", d: "" } },
  related: ["fractions", "percentage", "quadratic"]
};

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function ratioOf(input) {
  const raw = str(input, "ratio", "Razón");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("Introduce una razón de 2 a 5 partes separadas por dos puntos, como 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`La parte «${t}» de la razón no es un número positivo.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("Las partes de la razón deben ser mayores que cero.", "ratio");
    return { n, scale: fp.length };
  });
  const K = Math.max(...parts.map((p) => p.scale));
  const scaled = parts.map((p) => p.n * 10n ** BigInt(K - p.scale));
  const g = scaled.reduce((x, y) => gcd(x, y));
  return { K, texts, scaled, g, red: scaled.map((x) => x / g) };
}

function simplifyMode(input) {
  const R = ratioOf(input);
  const steps = [];
  if (R.K > 0) steps.push({ text: `Multiplicamos todas las partes por ${10n ** BigInt(R.K)} para que sean números enteros:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "Máximo común divisor de todas las partes:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "Dividimos cada parte entre este divisor:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "No hay ningún divisor común mayor que 1, así que la razón ya está simplificada:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "Razón en su forma más sencilla", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "Cantidad total", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "Primero simplificamos la razón y luego sumamos sus partes:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `Parte de ${i + 1} = cantidad × su parte ÷ total:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "Comprobamos que la suma de las partes es igual a la cantidad:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `Parte ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} en la razón ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `Término ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`Introduce tres términos y deja uno vacío (has introducido ${4 - blanks.length} términos).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("El denominador b no puede ser cero en la proporción.", "b");
  if (k !== "d" && v.d === 0) fail("El denominador d no puede ser cero en la proporción.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`No se puede resolver porque el término ${divisorKey} es igual a cero.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`El término ${k} calculado es igual a cero, así que un denominador de la proporción se vuelve cero.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "En la proporción a/b = c/d, los productos de los términos cruzados son iguales:", tex: "a\\cdot d = b\\cdot c" },
    { text: `Resolvemos la ecuación para hallar el término ${k}:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "Comprobamos la proporción tras resolverla:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `Término desconocido ${k}`, value: N(x) },
      { label: "La proporción completa", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "Primer valor x₁", { positive: true });
  const y1 = num(input, "y1", "Valor correspondiente y₁", { nonNegative: true });
  const x2 = num(input, "x2", "Segundo valor x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "inversa" : "directa";
  const steps = inverse
    ? [
        { text: "En la proporcionalidad inversa, el producto y·x permanece constante:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "Resolvemos la ecuación para hallar y₂:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "En la proporcionalidad directa, el cociente y/x permanece constante:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "Resolvemos la ecuación para hallar y₂:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "Valor desconocido y₂", value: N(y2) },
      { label: inverse ? "Constante de proporcionalidad inversa y·x" : "Constante de proporcionalidad directa y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (proporcionalidad ${name})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de problema", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
