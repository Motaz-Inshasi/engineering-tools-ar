import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "10 kg pertama dengan laju 100 mL per kg per hari:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "10 kg berikutnya dengan laju 50 mL per kg per hari:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "Kelebihan di atas 20 kg dengan laju 20 mL per kg per hari:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "Total kebutuhan harian:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "Laju per jam dengan aturan 4-2-1:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "Kebutuhan harian", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "Laju per jam (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "Tingkat kebutuhan pemeliharaan (Holliday-Segar)",
      head: ["Kelompok", "Berat (kg)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["10 kg pertama", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["11 hingga 20 kg", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["Di atas 20 kg", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `Kebutuhan harian ${fmt(daily)} mL/day, yaitu ${fmt(hourly)} mL/h (aturan 4-2-1)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "Volume larutan selama 24 jam dari rumus Parkland:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "Setengah volume diberikan dalam 8 jam pertama:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "Laju 8 jam pertama:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "Setengah kedua diberikan dalam 16 jam berikutnya:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "Total 24 jam", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "Laju 8 jam pertama", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "Laju 16 jam berikutnya", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "Tabel laju Parkland",
      head: ["Periode", "Volume (mL)", "Laju (mL/h)"],
      rows: [
        ["8 jam pertama sejak waktu luka bakar", fmt(half), fmt(r1)],
        ["16 jam berikutnya", fmt(half), fmt(r2)]
      ]
    },
    copy: `Parkland: ${fmt(total)} mL selama 24 jam, 8 jam pertama ${fmt(r1)} mL/h lalu ${fmt(r2)} mL/h selama 16 jam`
  };
}

export const meta = {
  description: "Hitung kebutuhan cairan harian untuk anak dan dewasa dengan aturan Holliday-Segar beserta laju per jam dengan aturan 4-2-1, atau volume resusitasi luka bakar dengan rumus Parkland beserta laju 8 jam pertama dan 16 jam berikutnya.",
  keywords: ["kebutuhan cairan", "Holliday-Segar", "aturan 4-2-1", "Parkland", "Parkland", "luka bakar", "pemeliharaan", "fluid requirements"],
  formulas: [
    { label: "Kebutuhan pemeliharaan harian", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "Rumus Parkland", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "maintenance", options: [["maintenance", "Kebutuhan pemeliharaan (Holliday-Segar)"], ["parkland", "Resusitasi luka bakar (Parkland)"]] },
    { id: "weight", label: "Berat", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "Persentase luas luka bakar dari tubuh", unit: "%TBSA", type: "number", default: "20", help: "Dari 1 hingga 100.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "Contoh: pasien dengan berat 70 kg dalam mode pemeliharaan." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "Berat", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "Persentase luka bakar", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
