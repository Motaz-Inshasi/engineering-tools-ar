import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const lin = (k) => ({ to: (x) => x * k, from: (b) => b / k, k });

export const UNITS = {
  length: { ar: "Longitud", base: "m", units: { m: ["metro", lin(1)], km: ["kilómetro", lin(1e3)], cm: ["centímetro", lin(1e-2)], mm: ["milímetro", lin(1e-3)], um: ["micrómetro", lin(1e-6)], nm: ["nanómetro", lin(1e-9)], in: ["pulgada", lin(0.0254)], ft: ["pie", lin(0.3048)], yd: ["yarda", lin(0.9144)], mi: ["milla", lin(1609.344)], nmi: ["milla náutica", lin(1852)], mil: ["mil (1/1000 pulgadas)", lin(2.54e-5)] } },
  energy: { ar: "Energía", base: "J", units: { J: ["julio", lin(1)], kJ: ["kilojulio", lin(1e3)], MJ: ["megajulio", lin(1e6)], Wh: ["vatio-hora", lin(3600)], kWh: ["kilovatio-hora", lin(3.6e6)], cal: ["caloría (internacional)", lin(4.1868)], kcal: ["kilocaloría", lin(4186.8)], eV: ["electronvoltio", lin(1.602176634e-19)], BTU: ["BTU (internacional)", lin(1055.05585262)], mAh5: ["mAh a 5 V", lin(18)] } },
  temperature: { ar: "Temperatura", base: "K", units: { C: ["Celsius °C", { to: (x) => x + 273.15, from: (b) => b - 273.15 }], F: ["Fahrenheit °F", { to: (x) => (x - 32) * 5 / 9 + 273.15, from: (b) => (b - 273.15) * 9 / 5 + 32 }], K: ["Kelvin K", lin(1)], R: ["Rankine °R", lin(5 / 9)] } },
  frequency: { ar: "Frecuencia", base: "Hz", units: { Hz: ["hercio", lin(1)], kHz: ["kilohercio", lin(1e3)], MHz: ["megahercio", lin(1e6)], GHz: ["gigahercio", lin(1e9)], rpm: ["revoluciones/minuto", lin(1 / 60)], rads: ["radianes/segundo", lin(1 / (2 * Math.PI))], period: ["Periodo en segundos (1/f)", { to: (x) => 1 / x, from: (b) => 1 / b }] } },
  power: { ar: "Potencia", base: "W", units: { W: ["vatio", lin(1)], mW: ["milivatio", lin(1e-3)], kW: ["kilovatio", lin(1e3)], MW: ["megavatio", lin(1e6)], hp: ["caballo de vapor mecánico", lin(745.6998715822702)], PS: ["caballo métrico", lin(735.49875)], dBm: ["dBm", { to: (x) => 1e-3 * Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b / 1e-3) }], dBW: ["dBW", { to: (x) => Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b) }], BTUh: ["BTU/h", lin(0.29307107017)] } },
  charge: { ar: "Carga eléctrica", base: "C", units: { C: ["culombio", lin(1)], mC: ["milicoulombio", lin(1e-3)], uC: ["microculombio", lin(1e-6)], Ah: ["amperio-hora", lin(3600)], mAh: ["miliamperio-hora", lin(3.6)], e: ["carga del electrón", lin(1.602176634e-19)] } }
};

const CATS = Object.entries(UNITS).map(([k, v]) => [k, v.ar]);
const opts = (cat) => Object.entries(UNITS[cat].units).map(([k, [ar]]) => [k, `${k} – ${ar}`]);
const DEF = { length: ["in", "mm"], energy: ["kWh", "MJ"], temperature: ["C", "F"], frequency: ["rpm", "Hz"], power: ["dBm", "mW"], charge: ["mAh", "C"] };

export const meta = {
  description: "Convierta entre unidades de longitud, energía, temperatura, frecuencia, potencia (con dBm) y carga eléctrica (con mAh), con una tabla del valor de entrada en todas las unidades de la categoría.",
  keywords: ["Conversión de unidades", "unit converter", "pulgada", "milímetro", "Fahrenheit", "Celsius", "dBm", "mAh", "kilovatio-hora", "caballo de vapor", "rpm"],
  formulas: [
    { label: "Conversión mediante una unidad base", tex: "x_{to} = f_{to}^{-1}\\left(f_{from}(x)\\right)" },
    { label: "Ejemplos no lineales", tex: "T_F = \\tfrac{9}{5}T_C + 32,\\qquad P_{dBm} = 10\\log_{10}\\frac{P}{1\\,mW}" }
  ],
  inputs: [
    { id: "cat", label: "Categoría", type: "select", default: "length", options: CATS },
    { id: "x", label: "Valor", type: "number", default: "1" },
    ...Object.keys(UNITS).flatMap((c) => [
      { id: `from_${c}`, label: "Desde", type: "select", default: DEF[c][0], options: opts(c), when: { cat: [c] } },
      { id: `to_${c}`, label: "Hasta", type: "select", default: DEF[c][1], options: opts(c), when: { cat: [c] } }
    ])
  ],
  example: { values: { cat: "temperature", x: "100", from_temperature: "C", to_temperature: "F" }, expect: ["100 C = 212 F"], note: "Ejemplo: 100 °C en Fahrenheit." },
  invalid: { values: { cat: "temperature", x: "-300", from_temperature: "C", to_temperature: "K" } },
  related: ["engineering-notation", "formulas-constants", "standard-resistor-values"]
};

export function convert(cat, x, from, to) {
  const U = UNITS[cat].units;
  return U[to][1].from(U[from][1].to(x));
}

export function solve(input) {
  const cat = choice(input, "cat", "Categoría", Object.keys(UNITS), "length");
  const keys = Object.keys(UNITS[cat].units);
  const from = choice(input, `from_${cat}`, "Unidad de origen", keys, DEF[cat][0]);
  const to = choice(input, `to_${cat}`, "Unidad de destino", keys, DEF[cat][1]);
  const x = num(input, "x", "Valor");
  const U = UNITS[cat].units;
  const base = U[from][1].to(x);
  if (cat === "temperature" && base < 0) fail("La temperatura está por debajo del cero absoluto (−273.15 °C), lo que es físicamente imposible.", "x");
  if (["frequency", "power", "length", "energy", "charge"].includes(cat) && (from === "period" || to === "period" || from === "dBm" || from === "dBW" || to === "dBm" || to === "dBW") && !(base > 0)) fail("Esta conversión requiere un valor positivo.", "x");
  const y = U[to][1].from(base);
  if (!isFinite(y)) fail("La conversión no produce un valor finito.", "x");
  const steps = [
    { text: `Primero convertimos a la unidad base de la categoría (${UNITS[cat].base}):`, tex: `${ntex(x)}\\ \\text{${from}} = ${ntex(base, 10)}\\ \\text{${UNITS[cat].base}}` },
    { text: "Luego, de la unidad base a la unidad de destino:", tex: `${ntex(base, 10)}\\ \\text{${UNITS[cat].base}} = ${ntex(y, 10)}\\ \\text{${to}}` }
  ];
  if (U[from][1].k && U[to][1].k) steps.push(`Factor de conversión directo: 1 ${from} = ${fmt(U[from][1].k / U[to][1].k, 10)} ${to}.`);
  const rows = keys.map((k) => {
    let v;
    try { v = U[k][1].from(base); } catch { v = NaN; }
    return [`${k}`, U[k][0], isFinite(v) ? fmt(v, 8) : "—"];
  });
  const text = `${fmt(x)} ${from} = ${fmt(y, 10)} ${to}`;
  return {
    results: [{ label: "Resultado", value: text, text }],
    blocks: [{ type: "table", caption: `Valor en todas las unidades de ${UNITS[cat].ar}`, head: ["Símbolo", "Unidad", "Valor"], rows }],
    steps, copy: text
  };
}
