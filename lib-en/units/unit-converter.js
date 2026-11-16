import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const lin = (k) => ({ to: (x) => x * k, from: (b) => b / k, k });

export const UNITS = {
  length: { ar: "Length", base: "m", units: { m: ["meter", lin(1)], km: ["kilometer", lin(1e3)], cm: ["centimeter", lin(1e-2)], mm: ["millimeter", lin(1e-3)], um: ["micrometer", lin(1e-6)], nm: ["nanometer", lin(1e-9)], in: ["inch", lin(0.0254)], ft: ["foot", lin(0.3048)], yd: ["yard", lin(0.9144)], mi: ["mile", lin(1609.344)], nmi: ["nautical mile", lin(1852)], mil: ["mil (1/1000 inch)", lin(2.54e-5)] } },
  energy: { ar: "Energy", base: "J", units: { J: ["joule", lin(1)], kJ: ["kilojoule", lin(1e3)], MJ: ["megajoule", lin(1e6)], Wh: ["watt-hour", lin(3600)], kWh: ["kilowatt-hour", lin(3.6e6)], cal: ["calorie (International Table)", lin(4.1868)], kcal: ["kilocalorie", lin(4186.8)], eV: ["electronvolt", lin(1.602176634e-19)], BTU: ["BTU (International)", lin(1055.05585262)], mAh5: ["mAh at 5 V", lin(18)] } },
  temperature: { ar: "Temperature", base: "K", units: { C: ["Celsius °C", { to: (x) => x + 273.15, from: (b) => b - 273.15 }], F: ["Fahrenheit °F", { to: (x) => (x - 32) * 5 / 9 + 273.15, from: (b) => (b - 273.15) * 9 / 5 + 32 }], K: ["Kelvin K", lin(1)], R: ["Rankine °R", lin(5 / 9)] } },
  frequency: { ar: "Frequency", base: "Hz", units: { Hz: ["hertz", lin(1)], kHz: ["kilohertz", lin(1e3)], MHz: ["megahertz", lin(1e6)], GHz: ["gigahertz", lin(1e9)], rpm: ["Revolutions per minute (rpm)", lin(1 / 60)], rads: ["radians per second", lin(1 / (2 * Math.PI))], period: ["Period in seconds (1/f)", { to: (x) => 1 / x, from: (b) => 1 / b }] } },
  power: { ar: "Power", base: "W", units: { W: ["watt", lin(1)], mW: ["milliwatt", lin(1e-3)], kW: ["kilowatt", lin(1e3)], MW: ["megawatt", lin(1e6)], hp: ["mechanical horsepower", lin(745.6998715822702)], PS: ["metric horsepower", lin(735.49875)], dBm: ["dBm", { to: (x) => 1e-3 * Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b / 1e-3) }], dBW: ["dBW", { to: (x) => Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b) }], BTUh: ["BTU/hour", lin(0.29307107017)] } },
  charge: { ar: "Electric charge", base: "C", units: { C: ["coulomb", lin(1)], mC: ["millicoulomb", lin(1e-3)], uC: ["microcoulomb", lin(1e-6)], Ah: ["ampere-hour", lin(3600)], mAh: ["milliampere-hour", lin(3.6)], e: ["Electron charge", lin(1.602176634e-19)] } }
};

const CATS = Object.entries(UNITS).map(([k, v]) => [k, v.ar]);
const opts = (cat) => Object.entries(UNITS[cat].units).map(([k, [ar]]) => [k, `${k} – ${ar}`]);
const DEF = { length: ["in", "mm"], energy: ["kWh", "MJ"], temperature: ["C", "F"], frequency: ["rpm", "Hz"], power: ["dBm", "mW"], charge: ["mAh", "C"] };

export const meta = {
  description: "Convert between length, energy, temperature, frequency, power (with dBm) and electric charge (with mAh) units, with a table showing the input value in all units of the category.",
  keywords: ["Unit converter", "unit converter", "inch", "millimeter", "Fahrenheit", "Celsius", "dBm", "mAh", "kilowatt-hour", "horsepower", "rpm"],
  formulas: [
    { label: "Conversion through a base unit", tex: "x_{to} = f_{to}^{-1}\\left(f_{from}(x)\\right)" },
    { label: "Nonlinear examples", tex: "T_F = \\tfrac{9}{5}T_C + 32,\\qquad P_{dBm} = 10\\log_{10}\\frac{P}{1\\,mW}" }
  ],
  inputs: [
    { id: "cat", label: "Category", type: "select", default: "length", options: CATS },
    { id: "x", label: "Value", type: "number", default: "1" },
    ...Object.keys(UNITS).flatMap((c) => [
      { id: `from_${c}`, label: "From", type: "select", default: DEF[c][0], options: opts(c), when: { cat: [c] } },
      { id: `to_${c}`, label: "To", type: "select", default: DEF[c][1], options: opts(c), when: { cat: [c] } }
    ])
  ],
  example: { values: { cat: "temperature", x: "100", from_temperature: "C", to_temperature: "F" }, expect: ["100 C = 212 F"], note: "Example: 100 °C in Fahrenheit." },
  invalid: { values: { cat: "temperature", x: "-300", from_temperature: "C", to_temperature: "K" } },
  related: ["engineering-notation", "formulas-constants", "standard-resistor-values"]
};

export function convert(cat, x, from, to) {
  const U = UNITS[cat].units;
  return U[to][1].from(U[from][1].to(x));
}

export function solve(input) {
  const cat = choice(input, "cat", "Category", Object.keys(UNITS), "length");
  const keys = Object.keys(UNITS[cat].units);
  const from = choice(input, `from_${cat}`, "Original unit", keys, DEF[cat][0]);
  const to = choice(input, `to_${cat}`, "Target unit", keys, DEF[cat][1]);
  const x = num(input, "x", "Value");
  const U = UNITS[cat].units;
  const base = U[from][1].to(x);
  if (cat === "temperature" && base < 0) fail("The temperature is below absolute zero (−273.15 °C), which is physically impossible.", "x");
  if (["frequency", "power", "length", "energy", "charge"].includes(cat) && (from === "period" || to === "period" || from === "dBm" || from === "dBW" || to === "dBm" || to === "dBW") && !(base > 0)) fail("This conversion requires a positive value.", "x");
  const y = U[to][1].from(base);
  if (!isFinite(y)) fail("The conversion does not give a finite value.", "x");
  const steps = [
    { text: `We first convert to the base unit of the category (${UNITS[cat].base}):`, tex: `${ntex(x)}\\ \\text{${from}} = ${ntex(base, 10)}\\ \\text{${UNITS[cat].base}}` },
    { text: "Then from the base unit to the target unit:", tex: `${ntex(base, 10)}\\ \\text{${UNITS[cat].base}} = ${ntex(y, 10)}\\ \\text{${to}}` }
  ];
  if (U[from][1].k && U[to][1].k) steps.push(`Direct conversion factor: 1 ${from} = ${fmt(U[from][1].k / U[to][1].k, 10)} ${to}.`);
  const rows = keys.map((k) => {
    let v;
    try { v = U[k][1].from(base); } catch { v = NaN; }
    return [`${k}`, U[k][0], isFinite(v) ? fmt(v, 8) : "—"];
  });
  const text = `${fmt(x)} ${from} = ${fmt(y, 10)} ${to}`;
  return {
    results: [{ label: "Result", value: text, text }],
    blocks: [{ type: "table", caption: `Value in all units of ${UNITS[cat].ar}`, head: ["Symbol", "Unit", "Value"], rows }],
    steps, copy: text
  };
}
