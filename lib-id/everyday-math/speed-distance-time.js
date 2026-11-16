import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "satu jam" : h === 2 ? "dua jam" : h <= 10 ? `${h} jam` : `${h} jam`);
const minWord = (m) => (m === 1 ? "1 menit" : m === 2 ? "dua menit" : m <= 10 ? `${m} menit` : `${m} menit`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" dan") : "0 menit";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "Waktu", { positive: true });
  const h = num(input, "timeH", "Jam", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "Menit", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("Waktu harus lebih besar dari nol.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "Satuan kecepatan", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "Format waktu", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("Masukkan tepat dua nilai dari kecepatan, jarak, dan waktu, dan biarkan yang ketiga kosong.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "Kecepatan", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "Jarak", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "Kecepatan = jarak ÷ waktu:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "Jarak = kecepatan × waktu:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "Waktu = jarak ÷ kecepatan:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "Konversi kecepatan ke tiga satuan:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "Kecepatan dalam kilometer per jam", value: `${fmt(v, 6)} km/jam` },
      { label: "Kecepatan dalam meter per detik", value: `${fmt(v / 3.6, 6)} m/s` },
      { label: "Kecepatan dalam mil per jam", value: `${fmt(v / KMH_FACTOR.mph, 6)} mil/jam` },
      { label: "Jarak", value: `${fmt(d, 6)} km` },
      { label: "Waktu", value: hm(t) },
      { label: "Waktu dalam jam desimal", value: `${fmt(t, 6)} jam` }
    ],
    steps,
    copy: `Kecepatan: ${fmt(v, 6)} km/jam, jarak: ${fmt(d, 6)} km, waktu: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "Data dua tahap", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "Jarak tahap pertama", { positive: true });
  const d2 = num(input, "d2", "Jarak tahap kedua", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "Kecepatan tahap pertama", { positive: true });
    v2 = num(input, "v2", "Kecepatan tahap kedua", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "Waktu tahap pertama", { positive: true });
    t2 = num(input, "t2", "Waktu tahap kedua", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "Waktu setiap tahap = jarak ÷ kecepatan:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "Kecepatan rata-rata = total jarak ÷ total waktu (bukan rata-rata dari dua kecepatan):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "Untuk dua jarak yang sama, rata-ratanya adalah rata-rata harmonik dari dua kecepatan:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "Kecepatan rata-rata", value: `${fmt(avg, 6)} km/jam` },
    { label: "Total jarak", value: `${fmt(D, 6)} km` },
    { label: "Total waktu", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "Rata-rata harmonik dari dua kecepatan", value: `${fmt(harmonic, 6)} km/jam` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "Saat menempuh dua jarak dengan dua kecepatan berbeda, rata-rata yang benar adalah rata-rata harmonik (atau berbobot jarak), bukan rata-rata aritmetika (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `Kecepatan rata-rata: ${fmt(avg, 6)} km/jam, total jarak: ${fmt(D, 6)} km, total waktu: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "Hitung kecepatan, jarak, atau waktu jika dua di antaranya diketahui, dengan konversi kecepatan antara km/jam, m/s, dan mil/jam, serta kecepatan rata-rata untuk dua tahap dengan rata-rata harmonik atau total jarak dibagi total waktu.",
  keywords: ["kecepatan", "jarak", "waktu", "Kecepatan rata-rata", "rata-rata harmonik", "speed distance time", "km/jam"],
  formulas: [
    { label: "Hubungan dasar", tex: "d = v \\times t" },
    { label: "Kecepatan rata-rata dua tahap dengan jarak sama", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "Kecepatan rata-rata keseluruhan", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "solve", options: [["solve", "Hitung yang tidak diketahui dari dua nilai"], ["average", "Kecepatan rata-rata dua tahap"]] },
    { id: "speed", label: "Kecepatan", type: "number", default: "80", when: { mode: ["solve"] }, help: "Kosongkan jika ini yang tidak diketahui." },
    { id: "speedUnit", label: "Satuan kecepatan", type: "select", default: "kmh", options: [["kmh", "km/jam"], ["ms", "meter/detik"], ["mph", "mil/jam"]], when: { mode: ["solve"] } },
    { id: "distance", label: "Jarak", unit: "km", type: "number", default: "120", when: { mode: ["solve"] }, help: "Kosongkan jika ini yang tidak diketahui." },
    { id: "timeMode", label: "Format waktu", type: "select", default: "decimal", options: [["decimal", "Jam desimal"], ["hm", "Jam dan menit"]], when: { mode: ["solve"] } },
    { id: "time", label: "Waktu", unit: "jam", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "Jam", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "Menit", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "Data dua tahap", type: "select", default: "speeds", options: [["speeds", "Jarak dan kecepatan untuk setiap tahap"], ["times", "Jarak dan waktu untuk setiap tahap"]], when: { mode: ["average"] } },
    { id: "d1", label: "Jarak tahap pertama", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "Kecepatan tahap pertama", unit: "km/jam", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "Waktu tahap pertama", unit: "jam", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "Jarak tahap kedua", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "Kecepatan tahap kedua", unit: "km/jam", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "Waktu tahap kedua", unit: "jam", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["satu jam dan 30 menit"],
    note: "Contoh: jarak 120 km dengan kecepatan 80 km/jam memerlukan satu jam dan 30 menit."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
