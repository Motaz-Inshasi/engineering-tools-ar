import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const IDS = ["v0", "v", "a", "t", "x"];
const NAMES = { v0: "Velocidad inicial v0", v: "Velocidad final v", a: "Aceleración a", t: "Tiempo t", x: "Desplazamiento x" };
const UNITS = { v0: "m/s", v: "m/s", a: "m/s²", t: "s", x: "m" };
const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;

function quadTex(A, B, C, t) {
  return `${T(A)}t^2 + ${S(B)}t + ${S(C)} = 0 \\Rightarrow t = ${T(t)}\\ s`;
}

function quadraticRoot(A, B, C, field) {
  const D = B * B - 4 * A * C;
  if (D < 0) fail("No existe un movimiento real que cumpla estos datos.", field);
  const q = Math.sqrt(D);
  const roots = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((r) => r > 0);
  if (roots.length === 0) fail("No existe un tiempo positivo que cumpla estos datos.", field);
  return Math.min(...roots);
}

export const meta = {
  description: "Resuelve las ecuaciones del movimiento con aceleración constante: introduce tres valores de v0, v, a, t y x para calcular los otros dos, con los pasos y las gráficas de v(t) y x(t).",
  keywords: ["Ecuaciones del movimiento", "SUVAT", "SUVAT", "Aceleración constante", "Velocidad", "Desplazamiento", "Tiempo", "kinematics"],
  formulas: [
    { label: "Ecuaciones del movimiento con aceleración constante", tex: "v = v_0 + at,\\qquad x = v_0 t + \\tfrac{1}{2}at^2,\\qquad v^2 = v_0^2 + 2ax" },
    { label: "Velocidad media", tex: "x = \\frac{v_0 + v}{2}\\,t" }
  ],
  inputs: [
    { id: "v0", label: "Velocidad inicial v0", unit: "m/s", type: "number", help: "Introduce exactamente tres de los cinco valores y deja vacío el resto." },
    { id: "v", label: "Velocidad final v", unit: "m/s", type: "number" },
    { id: "a", label: "Aceleración a", unit: "m/s²", type: "number", help: "Positivo para aceleración y negativo para desaceleración." },
    { id: "t", label: "Tiempo t", unit: "s", type: "number" },
    { id: "x", label: "Desplazamiento x", unit: "m", type: "number" }
  ],
  example: { values: { v0: "0", v: "", a: "9.81", t: "3", x: "" }, expect: ["v = 29.43 m/s", "x = 44.145 m"], note: "Ejemplo: un cuerpo parte del reposo con una aceleración de 9.81 m/s² durante 3 s." },
  invalid: { values: { v0: "5", v: "10", a: "2", t: "3", x: "" } },
  related: ["projectile-motion", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const given = IDS.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : IDS.find((k) => isBlank(input[k]));
    fail(`Introduce exactamente tres de los cinco valores (introdujiste ${given.length}).`, field);
  }
  const u = {};
  for (const k of given) u[k] = num(input, k, NAMES[k], k === "t" ? { positive: true } : {});
  let { v0, v, a, t, x } = u;
  const steps = [];
  switch (given.join("")) {
    case "v0va": {
      if (a === 0) {
        if (v !== v0) fail("Si a = 0, v debe ser igual a la velocidad inicial v0.", "v");
        fail("Si a = 0 y v = v0, no se puede determinar el tiempo ni el desplazamiento con estos datos.", "a");
      }
      t = (v - v0) / a;
      if (!(t > 0)) fail("El tiempo resultante no es positivo, por lo que los datos no describen un movimiento futuro.", "a");
      x = (v * v - v0 * v0) / (2 * a);
      steps.push({ text: "De la ecuación de velocidad v = v0 + at calculamos el tiempo:", tex: `t = \\frac{v - v_0}{a} = \\frac{${S(v)} - ${S(v0)}}{${S(a)}} = ${T(t)}\\ s` });
      steps.push({ text: "De la ecuación sin tiempo v² = v0² + 2ax calculamos el desplazamiento:", tex: `x = \\frac{v^2 - v_0^2}{2a} = ${T(x)}\\ m` });
      break;
    }
    case "v0vt": {
      a = (v - v0) / t;
      x = ((v0 + v) / 2) * t;
      steps.push({ text: "De la ecuación de velocidad v = v0 + at calculamos la aceleración:", tex: `a = \\frac{v - v_0}{t} = \\frac{${S(v)} - ${S(v0)}}{${T(t)}} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "La velocidad media en un movimiento con aceleración constante da el desplazamiento:", tex: `x = \\frac{v_0 + v}{2}\\,t = ${T(x)}\\ m` });
      break;
    }
    case "v0vx": {
      if (v0 + v === 0) fail("La suma de v0 y v es cero, por lo que no se puede determinar el tiempo a partir del desplazamiento.", "x");
      t = (2 * x) / (v0 + v);
      if (!(t > 0)) fail("El desplazamiento no concuerda con las dos velocidades dadas porque el tiempo resultante no es positivo.", "x");
      a = (v - v0) / t;
      steps.push({ text: "De x = (v0 + v)t / 2 calculamos el tiempo:", tex: `t = \\frac{2x}{v_0 + v} = ${T(t)}\\ s` });
      steps.push({ text: "De la ecuación de velocidad calculamos la aceleración:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "v0at": {
      v = v0 + a * t;
      x = v0 * t + 0.5 * a * t * t;
      steps.push({ text: "Ecuación de velocidad:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      steps.push({ text: "Ecuación de desplazamiento:", tex: `x = v_0 t + \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "v0ax": {
      if (a === 0) {
        if (v0 === 0) fail("Si a = 0 y v0 = 0 el cuerpo no se mueve, por lo que no se puede determinar el tiempo.", "v0");
        t = x / v0;
        if (!(t > 0)) fail("El desplazamiento y la velocidad inicial tienen signos opuestos, por lo que no hay un tiempo positivo.", "x");
        steps.push({ text: "Si a = 0 la ecuación de desplazamiento es lineal: x = v0 t", tex: `t = \\frac{x}{v_0} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, v0, -x, "x");
        steps.push({ text: "Resolvemos la ecuación x = v0 t + ½at² y tomamos la menor raíz positiva:", tex: quadTex(a / 2, v0, -x, t) });
      }
      v = v0 + a * t;
      steps.push({ text: "Ecuación de velocidad:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "v0tx": {
      a = (2 * (x - v0 * t)) / (t * t);
      v = v0 + a * t;
      steps.push({ text: "De x = v0 t + ½at² calculamos la aceleración:", tex: `a = \\frac{2(x - v_0 t)}{t^2} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "Ecuación de velocidad:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "vat": {
      v0 = v - a * t;
      x = v * t - 0.5 * a * t * t;
      steps.push({ text: "Despejamos la ecuación de velocidad para hallar la velocidad inicial:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      steps.push({ text: "Ecuación de desplazamiento en función de la velocidad final:", tex: `x = vt - \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "vax": {
      if (a === 0) {
        if (v === 0) fail("Si a = 0 y v = 0 no se puede determinar el tiempo.", "v");
        t = x / v;
        if (!(t > 0)) fail("El desplazamiento y la velocidad final tienen signos opuestos, por lo que no hay un tiempo positivo.", "x");
        steps.push({ text: "Si a = 0 la ecuación de desplazamiento es lineal: x = vt", tex: `t = \\frac{x}{v} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, -v, x, "x");
        steps.push({ text: "Resolvemos la ecuación x = vt - ½at² y tomamos la menor raíz positiva:", tex: quadTex(a / 2, -v, x, t) });
      }
      v0 = v - a * t;
      steps.push({ text: "Despejamos la ecuación de velocidad para hallar la velocidad inicial:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      break;
    }
    case "vtx": {
      v0 = (2 * x) / t - v;
      a = (v - v0) / t;
      steps.push({ text: "De x = (v0 + v)t / 2 calculamos la velocidad inicial:", tex: `v_0 = \\frac{2x}{t} - v = ${T(v0)}\\ m/s` });
      steps.push({ text: "De la ecuación de velocidad calculamos la aceleración:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "atx": {
      v0 = (x - 0.5 * a * t * t) / t;
      v = v0 + a * t;
      steps.push({ text: "De x = v0 t + ½at² calculamos la velocidad inicial:", tex: `v_0 = \\frac{x - \\frac{1}{2}at^2}{t} = ${T(v0)}\\ m/s` });
      steps.push({ text: "Ecuación de velocidad:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
  }
  const vals = { v0, v, a, t, x };
  const results = IDS.map((k) => ({
    label: `${NAMES[k]} ${given.includes(k) ? "(dado)" : "(calculado)"}`,
    value: `${fmt(vals[k], 6)} ${UNITS[k]}`
  }));
  const copy = `v = ${fmt(v)} m/s، x = ${fmt(x)} m، t = ${fmt(t)} s، a = ${fmt(a)} m/s²`;
  const N = 60;
  const ts = Array.from({ length: N + 1 }, (_, i) => (t * i) / N);
  const blocks = [
    { type: "plot", title: "Velocidad frente al tiempo v(t)", xLabel: "t (s)", yLabel: "v (m/s)", includeZero: true, series: [{ name: "v(t)", points: ts.map((s) => [s, v0 + a * s]) }] },
    { type: "plot", title: "Desplazamiento frente al tiempo x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: ts.map((s) => [s, v0 * s + 0.5 * a * s * s]) }] }
  ];
  return { results, steps, copy, blocks, values: vals };
}
