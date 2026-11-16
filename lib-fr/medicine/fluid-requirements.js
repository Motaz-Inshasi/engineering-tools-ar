import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "Les 10 premiers kg à raison de 100 mL par kg et par jour :", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "Les 10 kg suivants à raison de 50 mL par kg et par jour :", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "Au-delà de 20 kg, à raison de 20 mL par kg et par jour :", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "Besoin quotidien total :", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "Débit horaire selon la règle 4-2-1 :", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "Besoin quotidien", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "Débit horaire (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "Tranches des besoins d'entretien (Holliday-Segar)",
      head: ["Tranche", "Poids (kg)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["10 premiers kg", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["De 11 à 20 kg", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["Au-delà de 20 kg", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `Besoin quotidien ${fmt(daily)} mL/jour, soit ${fmt(hourly)} mL/h (règle 4-2-1)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "Volume de solution sur 24 heures selon la formule de Parkland :", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "La moitié du volume est administrée durant les 8 premières heures :", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "Débit des 8 premières heures :", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "La seconde moitié est administrée durant les 16 heures suivantes :", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "Total sur 24 heures", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "Débit des 8 premières heures", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "Débit des 16 heures suivantes", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "Tableau des débits de Parkland",
      head: ["Période", "Volume (mL)", "Débit (mL/h)"],
      rows: [
        ["8 premières heures après la brûlure", fmt(half), fmt(r1)],
        ["16 heures suivantes", fmt(half), fmt(r2)]
      ]
    },
    copy: `Parkland : ${fmt(total)} mL sur 24 heures, 8 premières heures à ${fmt(r1)} mL/h, puis ${fmt(r2)} mL/h pendant 16 heures`
  };
}

export const meta = {
  description: "Calculez le besoin quotidien en liquides des enfants et des adultes selon la règle de Holliday-Segar, avec le débit horaire selon la règle 4-2-1, ou le volume de réanimation des brûlés selon la formule de Parkland, avec les débits des 8 premières heures et des 16 heures suivantes.",
  keywords: ["besoin en liquides", "Holliday-Segar", "règle 4-2-1", "Parkland", "Parkland", "brûlures", "entretien", "fluid requirements"],
  formulas: [
    { label: "Besoin d'entretien quotidien", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "Formule de Parkland", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "maintenance", options: [["maintenance", "Besoin d'entretien (Holliday-Segar)"], ["parkland", "Réanimation des brûlés (Parkland)"]] },
    { id: "weight", label: "Poids", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "Surface corporelle brûlée", unit: "%TBSA", type: "number", default: "20", help: "De 1 à 100.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "Exemple : patient pesant 70 kg en mode entretien." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "Poids", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "Surface brûlée", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
