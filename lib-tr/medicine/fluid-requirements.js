import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "İlk 10 kg için günlük kilogram başına 100 mL:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "Sonraki 10 kg için günlük kilogram başına 50 mL:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "20 kg'ı aşan kısım için günlük kilogram başına 20 mL:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "Toplam günlük ihtiyaç:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "4-2-1 kuralıyla saatlik hız:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "Günlük ihtiyaç", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "Saatlik hız (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "Bakım ihtiyacı dilimleri (Holliday-Segar)",
      head: ["Dilim", "Kilo (kg)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["İlk 10 kg", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["11 ile 20 kg arası", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["20 kg üzeri", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `Günlük ihtiyaç ${fmt(daily)} mL/gün, yani ${fmt(hourly)} mL/saat (4-2-1 kuralı)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "Parkland formülüne göre 24 saatlik çözelti hacmi:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "Yarısı ilk 8 saatte verilir:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "İlk 8 saatin hızı:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "İkinci yarısı sonraki 16 saatte verilir:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "24 saat toplam", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "İlk 8 saatin hızı", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "Sonraki 16 saatin hızı", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "Parkland hız tablosu",
      head: ["Süre", "Hacim (mL)", "Hız (mL/saat)"],
      rows: [
        ["Yanıktan sonraki ilk 8 saat", fmt(half), fmt(r1)],
        ["Sonraki 16 saat", fmt(half), fmt(r2)]
      ]
    },
    copy: `Parkland: 24 saatte ${fmt(total)} mL; ilk 8 saat ${fmt(r1)} mL/saat, ardından 16 saat ${fmt(r2)} mL/saat`
  };
}

export const meta = {
  description: "Çocuklar ve yetişkinler için Holliday-Segar kuralıyla günlük sıvı ihtiyacını ve 4-2-1 kuralıyla saatlik hızı; ya da yanıklar için Parkland formülüyle canlandırma hacmini, ilk 8 saat ve sonraki 16 saat hızlarıyla birlikte hesaplayın.",
  keywords: ["Sıvı ihtiyacı", "Holliday-Segar", "4-2-1 kuralı", "Parkland", "Parkland", "Yanıklar", "Bakım", "fluid requirements"],
  formulas: [
    { label: "Günlük bakım ihtiyacı", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "Parkland formülü", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "maintenance", options: [["maintenance", "Bakım ihtiyacı (Holliday-Segar)"], ["parkland", "Yanık canlandırması (Parkland)"]] },
    { id: "weight", label: "Kilo", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "Yanık alanının vücut yüzeyine oranı", unit: "%TBSA", type: "number", default: "20", help: "1 ile 100 arası.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "Örnek: bakım durumunda 70 kg'lık bir hasta." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "Kilo", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "Yanık oranı", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
