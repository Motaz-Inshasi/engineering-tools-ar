import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const lin = (k) => ({ to: (x) => x * k, from: (b) => b / k, k });

export const UNITS = {
  length: { ar: "Longueur", base: "m", units: { m: ["mètre", lin(1)], km: ["kilomètre", lin(1e3)], cm: ["centimètre", lin(1e-2)], mm: ["millimètre", lin(1e-3)], um: ["micromètre", lin(1e-6)], nm: ["nanomètre", lin(1e-9)], in: ["pouce", lin(0.0254)], ft: ["pied", lin(0.3048)], yd: ["yard", lin(0.9144)], mi: ["mille", lin(1609.344)], nmi: ["mille nautique", lin(1852)], mil: ["mil (1/1000 de pouce)", lin(2.54e-5)] } },
  energy: { ar: "Énergie", base: "J", units: { J: ["joule", lin(1)], kJ: ["kilojoule", lin(1e3)], MJ: ["mégajoule", lin(1e6)], Wh: ["wattheure", lin(3600)], kWh: ["kilowattheure", lin(3.6e6)], cal: ["calorie (internationale)", lin(4.1868)], kcal: ["kilocalorie", lin(4186.8)], eV: ["électronvolt", lin(1.602176634e-19)], BTU: ["BTU (international)", lin(1055.05585262)], mAh5: ["mAh à 5 V", lin(18)] } },
  temperature: { ar: "Température", base: "K", units: { C: ["Celsius °C", { to: (x) => x + 273.15, from: (b) => b - 273.15 }], F: ["Fahrenheit °F", { to: (x) => (x - 32) * 5 / 9 + 273.15, from: (b) => (b - 273.15) * 9 / 5 + 32 }], K: ["Kelvin K", lin(1)], R: ["Rankine °R", lin(5 / 9)] } },
  frequency: { ar: "Fréquence", base: "Hz", units: { Hz: ["hertz", lin(1)], kHz: ["kilohertz", lin(1e3)], MHz: ["mégahertz", lin(1e6)], GHz: ["gigahertz", lin(1e9)], rpm: ["tr/min", lin(1 / 60)], rads: ["radian/seconde", lin(1 / (2 * Math.PI))], period: ["Période en secondes (1/f)", { to: (x) => 1 / x, from: (b) => 1 / b }] } },
  power: { ar: "Puissance", base: "W", units: { W: ["watt", lin(1)], mW: ["milliwatt", lin(1e-3)], kW: ["kilowatt", lin(1e3)], MW: ["mégawatt", lin(1e6)], hp: ["cheval-vapeur mécanique", lin(745.6998715822702)], PS: ["cheval-vapeur métrique", lin(735.49875)], dBm: ["dBm", { to: (x) => 1e-3 * Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b / 1e-3) }], dBW: ["dBW", { to: (x) => Math.pow(10, x / 10), from: (b) => 10 * Math.log10(b) }], BTUh: ["BTU/h", lin(0.29307107017)] } },
  charge: { ar: "Charge électrique", base: "C", units: { C: ["coulomb", lin(1)], mC: ["millicoulomb", lin(1e-3)], uC: ["microcoulomb", lin(1e-6)], Ah: ["ampère-heure", lin(3600)], mAh: ["milliampère-heure", lin(3.6)], e: ["Charge de l'électron", lin(1.602176634e-19)] } }
};

const CATS = Object.entries(UNITS).map(([k, v]) => [k, v.ar]);
const opts = (cat) => Object.entries(UNITS[cat].units).map(([k, [ar]]) => [k, `${k} – ${ar}`]);
const DEF = { length: ["in", "mm"], energy: ["kWh", "MJ"], temperature: ["C", "F"], frequency: ["rpm", "Hz"], power: ["dBm", "mW"], charge: ["mAh", "C"] };

export const meta = {
  description: "Convertissez entre les unités de longueur, d'énergie, de température, de fréquence, de puissance (avec dBm) et de charge électrique (avec mAh), avec un tableau de la valeur saisie dans toutes les unités de la catégorie.",
  keywords: ["Conversion d'unités", "unit converter", "pouce", "millimètre", "Fahrenheit", "Celsius", "dBm", "mAh", "kilowattheure", "cheval-vapeur", "rpm"],
  formulas: [
    { label: "Conversion via une unité de base", tex: "x_{to} = f_{to}^{-1}\\left(f_{from}(x)\\right)" },
    { label: "Exemples non linéaires", tex: "T_F = \\tfrac{9}{5}T_C + 32,\\qquad P_{dBm} = 10\\log_{10}\\frac{P}{1\\,mW}" }
  ],
  inputs: [
    { id: "cat", label: "Catégorie", type: "select", default: "length", options: CATS },
    { id: "x", label: "Valeur", type: "number", default: "1" },
    ...Object.keys(UNITS).flatMap((c) => [
      { id: `from_${c}`, label: "De", type: "select", default: DEF[c][0], options: opts(c), when: { cat: [c] } },
      { id: `to_${c}`, label: "Vers", type: "select", default: DEF[c][1], options: opts(c), when: { cat: [c] } }
    ])
  ],
  example: { values: { cat: "temperature", x: "100", from_temperature: "C", to_temperature: "F" }, expect: ["100 C = 212 F"], note: "Exemple : 100 °C en Fahrenheit." },
  invalid: { values: { cat: "temperature", x: "-300", from_temperature: "C", to_temperature: "K" } },
  related: ["engineering-notation", "formulas-constants", "standard-resistor-values"]
};

export function convert(cat, x, from, to) {
  const U = UNITS[cat].units;
  return U[to][1].from(U[from][1].to(x));
}

export function solve(input) {
  const cat = choice(input, "cat", "Catégorie", Object.keys(UNITS), "length");
  const keys = Object.keys(UNITS[cat].units);
  const from = choice(input, `from_${cat}`, "Unité d'origine", keys, DEF[cat][0]);
  const to = choice(input, `to_${cat}`, "Unité cible", keys, DEF[cat][1]);
  const x = num(input, "x", "Valeur");
  const U = UNITS[cat].units;
  const base = U[from][1].to(x);
  if (cat === "temperature" && base < 0) fail("La température est inférieure au zéro absolu (−273.15 °C), ce qui est physiquement impossible.", "x");
  if (["frequency", "power", "length", "energy", "charge"].includes(cat) && (from === "period" || to === "period" || from === "dBm" || from === "dBW" || to === "dBm" || to === "dBW") && !(base > 0)) fail("Cette conversion nécessite une valeur positive.", "x");
  const y = U[to][1].from(base);
  if (!isFinite(y)) fail("La conversion ne donne pas une valeur finie.", "x");
  const steps = [
    { text: `Nous convertissons d'abord vers l'unité de base de la catégorie (${UNITS[cat].base}) :`, tex: `${ntex(x)}\\ \\text{${from}} = ${ntex(base, 10)}\\ \\text{${UNITS[cat].base}}` },
    { text: "Puis de l'unité de base vers l'unité cible :", tex: `${ntex(base, 10)}\\ \\text{${UNITS[cat].base}} = ${ntex(y, 10)}\\ \\text{${to}}` }
  ];
  if (U[from][1].k && U[to][1].k) steps.push(`Facteur de conversion direct : 1 ${from} = ${fmt(U[from][1].k / U[to][1].k, 10)} ${to}.`);
  const rows = keys.map((k) => {
    let v;
    try { v = U[k][1].from(base); } catch { v = NaN; }
    return [`${k}`, U[k][0], isFinite(v) ? fmt(v, 8) : "—"];
  });
  const text = `${fmt(x)} ${from} = ${fmt(y, 10)} ${to}`;
  return {
    results: [{ label: "Résultat", value: text, text }],
    blocks: [{ type: "table", caption: `Valeur dans toutes les unités de ${UNITS[cat].ar}`, head: ["Symbole", "Unité", "Valeur"], rows }],
    steps, copy: text
  };
}
