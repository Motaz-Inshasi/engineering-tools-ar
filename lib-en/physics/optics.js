import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Computes the image position, magnification, type, orientation and power of a lens from the lens and mirror equation, or the refraction angle of light by Snell's law, with the critical angle and total internal reflection.",
  keywords: ["lens", "mirror", "focal length", "lens equation", "magnification", "lens power", "diopter", "Snell's law", "refraction", "total internal reflection", "lens", "mirror", "snell"],
  formulas: [
    { label: "Lens and mirror equation", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i},\\qquad m = -\\frac{d_i}{d_o},\\qquad P = \\frac{1}{f}" },
    { label: "Snell's law", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2,\\qquad \\theta_c = \\sin^{-1}\\frac{n_2}{n_1}" }
  ],
  inputs: [
    { id: "mode", label: "Problem type", type: "select", default: "lens", options: [["lens", "Lenses and mirrors"], ["snell", "Refraction of light (Snell)"]] },
    { id: "ot", label: "Element type", type: "select", default: "lens", options: [["lens", "lens"], ["mirror", "mirror"]], when: { mode: ["lens"] }, help: "Positive f: converging lens or concave mirror. Negative f: diverging lens or convex mirror." },
    { id: "f", label: "Focal length f", unit: "m", type: "number", default: "0.1", when: { mode: ["lens"] }, help: "Enter a negative f for a diverging lens or a convex mirror." },
    { id: "do", label: "Object distance do", unit: "m", type: "number", default: "0.3", when: { mode: ["lens"] } },
    { id: "n1", label: "Refractive index n1", type: "number", default: "1", when: { mode: ["snell"] }, help: "Air ≈ 1, water ≈ 1.33, glass ≈ 1.5." },
    { id: "th1", label: "Angle of incidence θ1", unit: "°", type: "number", default: "30", when: { mode: ["snell"] }, help: "Measured from the normal to the surface." },
    { id: "n2", label: "Refractive index n2", type: "number", default: "1.5", when: { mode: ["snell"] } }
  ],
  example: {
    values: { mode: "snell", ot: "lens", f: "0.1", do: "0.3", n1: "1", th1: "30", n2: "1.5" },
    expect: ["θ2 = 19.47°"],
    note: "Example: light travelling from air into glass at an angle of incidence of 30°."
  },
  invalid: { values: { mode: "lens", ot: "lens", f: "0", do: "0.3", n1: "1", th1: "30", n2: "1.5" } },
  related: ["waves-doppler", "harmonic-motion", "unit-converter", "formulas-constants"]
};

function lens(input) {
  const ot = choice(input, "ot", "Element type", ["lens", "mirror"], "lens");
  const f = num(input, "f", "Focal length f", { nonZero: true });
  const d = num(input, "do", "Object distance do", { positive: true });
  const el = ot === "lens" ? "lens" : "mirror";
  const power = 1 / f;
  const steps = [{ text: "Lens and mirror equation:", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}" }];
  const results = [];
  const blocks = [];
  let copy;
  if (Math.abs(d - f) <= 1e-12 * Math.abs(f)) {
    steps.push({ text: "When the object distance equals the focal length, the image is at infinity:", tex: "\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o} = 0" });
    results.push({ label: `Image distance from the ${el} di`, value: "At infinity" });
    blocks.push({ type: "note", tone: "warn", text: "The object lies exactly at the focus, so the outgoing rays are parallel and do not meet, and there is no image with a finite position." });
    copy = `Image at infinity (object at the focus)`;
  } else {
    const di = f * d / (d - f);
    const m = -di / d;
    const type = di > 0 ? "real" : "virtual";
    const dir = m > 0 ? "upright" : "inverted";
    const size = Math.abs(m) > 1 ? "enlarged" : Math.abs(m) < 1 ? "reduced" : "same size";
    steps.push(
      { text: "Image distance:", tex: `d_i = \\frac{f\\,d_o}{d_o - f} = \\frac{${ntex(f)} \\times ${ntex(d)}}{${ntex(d)} - ${ntex(f)}} = ${ntex(di, 6)}\\ m` },
      { text: "Magnification:", tex: `m = -\\frac{d_i}{d_o} = ${ntex(m, 6)}` }
    );
    results.push(
      { label: `Image distance from the ${el} di`, value: `${fmt(di, 4)} m` },
      { label: "Image type", value: type },
      { label: "Image orientation", value: dir },
      { label: "Image size", value: size },
      { label: "Magnification m", value: fmt(m, 4) }
    );
    copy = `di = ${fmt(di, 4)} m, m = ${fmt(m, 4)} (${type}، ${dir}، ${size})`;
  }
  steps.push({ text: "Lens power in diopters:", tex: `P = \\frac{1}{f} = ${ntex(power, 6)}\\ D` });
  results.push({ label: "Power P = 1/f", value: `${fmt(power, 4)} D` });
  return { results, steps, blocks, copy: `${copy}, P = ${fmt(power, 4)} D` };
}

function snell(input) {
  const n1 = num(input, "n1", "Refractive index n1", { positive: true });
  const th1 = num(input, "th1", "Angle of incidence θ1", { nonNegative: true, below: 90 });
  const n2 = num(input, "n2", "Refractive index n2", { positive: true });
  const s = n1 * Math.sin(th1 * DEG) / n2;
  const steps = [{ text: "Snell's law:", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" }];
  const results = [];
  const blocks = [];
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;
  results.push({ label: "Critical angle θc", value: crit === null ? "None (n1 ≤ n2)" : `${fmt(crit, 4)}°` });
  let copy;
  if (s > 1) {
    steps.push({ text: "sin θ2 is greater than 1, so there is no refraction angle:", tex: `\\sin\\theta_2 = \\frac{${ntex(n1)}\\sin ${ntex(th1)}^\\circ}{${ntex(n2)}} = ${ntex(s, 6)} > 1` });
    results.push({ label: "Refraction angle θ2", value: "None (total internal reflection)" });
    blocks.push({ type: "note", tone: "warn", text: "Total internal reflection: the light does not leave into the second medium, but is reflected entirely inside the denser medium." });
    copy = `Total internal reflection at θ1 = ${fmt(th1, 4)}°`;
  } else {
    const th2 = Math.asin(s) / DEG;
    steps.push({ text: "Refraction angle:", tex: `\\sin\\theta_2 = ${ntex(s, 6)},\\quad \\theta_2 = ${ntex(th2, 6)}^\\circ` });
    results.push({ label: "Refraction angle θ2", value: `${fmt(th2, 4)}°` });
    copy = `θ2 = ${fmt(th2, 4)}°`;
  }
  if (crit !== null) {
    steps.push({ text: "Critical angle (because n1 > n2):", tex: `\\theta_c = \\sin^{-1}\\frac{${ntex(n2)}}{${ntex(n1)}} = ${ntex(crit, 6)}^\\circ` });
    copy += `, θc = ${fmt(crit, 4)}°`;
  }
  return { results, steps, blocks, copy };
}

export function solve(input) {
  const mode = choice(input, "mode", "Problem type", ["lens", "snell"], "lens");
  return mode === "snell" ? snell(input) : lens(input);
}
