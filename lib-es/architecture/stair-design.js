import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Diseñe la escalera entre dos plantas: calcule el número de peldaños, la altura de la contrahuella y la profundidad de la huella según la regla de Blondel, y luego compruebe los criterios y la longitud horizontal disponible.",
  keywords: ["escalera", "regla de Blondel", "altura de la contrahuella", "profundidad de la huella", "stair", "blondel", "ángulo de la escalera"],
  formulas: [
    { label: "Número de peldaños", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "Altura de la contrahuella y profundidad de la huella", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "Recorrido horizontal y ángulo de la escalera", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "Altura entre plantas H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "Altura preferida de la contrahuella R", unit: "cm", type: "number", default: "17", help: "Aproximada; la contrahuella se ajusta para dividir la altura con exactitud." },
    { id: "blondel", label: "Objetivo de Blondel 2R + G", unit: "cm", type: "number", default: "63", help: "El valor ideal está entre 60 y 64 cm." },
    { id: "avail", label: "Longitud horizontal disponible", unit: "cm", type: "number", help: "Opcional: para comprobar que la escalera cabe en el espacio." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "Ejemplo: altura de 300 cm entre dos plantas." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "Altura entre plantas", { positive: true });
  const Rp = num(input, "riser", "Altura preferida de la contrahuella", { positive: true, max: 30 });
  const B = num(input, "blondel", "Objetivo de Blondel", { positive: true, max: 100 });
  const avail = num(input, "avail", "Longitud horizontal disponible", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("La altura es demasiado pequeña para la contrahuella preferida; la escalera necesita al menos dos peldaños.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("El objetivo de Blondel es demasiado pequeño para esta altura; auméntelo o reduzca el número de peldaños.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "Altura de la contrahuella R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "Profundidad de la huella G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "Regla de Blondel 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "ángulo de la escalera", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "Recorrido horizontal frente a la longitud disponible", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "Adecuada y cumple los criterios" : "Necesita ajustes";
  const steps = [
    { text: "Número de peldaños, redondeado a partir de la altura preferida:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "Altura real de la contrahuella:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "Profundidad de la huella según la regla de Blondel:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "Recorrido horizontal de la escalera:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "Ángulo de la escalera:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "Longitud de la zanca inclinada:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "Comprobación de criterios", head: ["Comprobación", "Valor", "Criterio", "Veredicto"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "Cumple" : "No cumple"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "Algunos criterios no se cumplen; ajuste la altura preferida, el objetivo de Blondel o la longitud disponible." });
  return {
    results: [
      { label: "Número de contrahuellas (alturas de peldaño) n", value: `${n}` },
      { label: "Número de huellas (superficies de peldaño)", value: `${treads}` },
      { label: "Altura de la contrahuella R", value: `${fmt(R, 4)} cm` },
      { label: "Profundidad de la huella G", value: `${fmt(G, 4)} cm` },
      { label: "Recorrido horizontal total", value: `${fmt(run, 4)} cm` },
      { label: "ángulo de la escalera", value: `${fmt(angle, 3)}°` },
      { label: "Longitud de la zanca inclinada", value: `${fmt(stringer, 4)} cm` },
      { label: "Veredicto", value: verdict }
    ],
    steps,
    blocks,
    copy: `Peldaños: ${n}, R = ${fmt(R, 4)} cm, G = ${fmt(G, 4)} cm, recorrido horizontal = ${fmt(run, 4)} cm, ángulo = ${fmt(angle, 3)}°, veredicto: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
