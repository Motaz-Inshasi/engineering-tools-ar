import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "1 saat" : h === 2 ? "2 saat" : h <= 10 ? `${h} saat` : `${h} saat`);
const minWord = (m) => (m === 1 ? "1 dakika" : m === 2 ? "2 dakika" : m <= 10 ? `${m} dakika` : `${m} dakika`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" ve ") : "0 dakika";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "Süre", { positive: true });
  const h = num(input, "timeH", "Saatler", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "Dakikalar", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("Süre sıfırdan büyük olmalıdır.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "Hız birimi", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "Süre formülü", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("Tam olarak iki değer girin (hız, mesafe veya süre) ve üçüncüsünü boş bırakın.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "Hız", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "Mesafe", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "Hız = mesafe ÷ süre:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "Mesafe = hız × süre:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "Süre = mesafe ÷ hız:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "Hızı üç birime çevirme:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "Hız km/saat cinsinden", value: `${fmt(v, 6)} km/saat` },
      { label: "Hız m/s cinsinden", value: `${fmt(v / 3.6, 6)} m/s` },
      { label: "Hız mil/saat cinsinden", value: `${fmt(v / KMH_FACTOR.mph, 6)} mil/saat` },
      { label: "Mesafe", value: `${fmt(d, 6)} km` },
      { label: "Süre", value: hm(t) },
      { label: "Süre ondalık saat cinsinden", value: `${fmt(t, 6)} saat` }
    ],
    steps,
    copy: `Hız: ${fmt(v, 6)} km/saat, mesafe: ${fmt(d, 6)} km, süre: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "İki aşamanın verileri", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "Birinci aşamanın mesafesi", { positive: true });
  const d2 = num(input, "d2", "İkinci aşamanın mesafesi", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "Birinci aşamanın hızı", { positive: true });
    v2 = num(input, "v2", "İkinci aşamanın hızı", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "Birinci aşamanın süresi", { positive: true });
    t2 = num(input, "t2", "İkinci aşamanın süresi", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "Her aşamanın süresi = mesafe ÷ hız:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "Ortalama hız = toplam mesafe ÷ toplam süre (iki hızın ortalaması değil):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "Eşit iki mesafe için ortalama, iki hızın harmonik ortalamasıdır:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "Ortalama hız", value: `${fmt(avg, 6)} km/saat` },
    { label: "Toplam mesafe", value: `${fmt(D, 6)} km` },
    { label: "Toplam süre", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "İki hızın harmonik ortalaması", value: `${fmt(harmonic, 6)} km/saat` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "Farklı iki hızla iki mesafe katedildiğinde doğru ortalama harmonik ortalamadır (ya da mesafeye göre ağırlıklı ortalama); aritmetik ortalama (v1 + v2) / 2 değildir." });
  }

  return {
    results,
    steps,
    copy: `Ortalama hız: ${fmt(avg, 6)} km/saat, toplam mesafe: ${fmt(D, 6)} km, toplam süre: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "İkisi bilindiğinde hız, mesafe veya süreyi hesaplayın; hızı km/saat, m/s ve mil/saat arasında çevirin; iki aşamalı ortalama hızı harmonik ortalama ile ya da toplam mesafenin toplam süreye bölünmesiyle bulun.",
  keywords: ["Hız", "Mesafe", "Süre", "Ortalama hız", "Harmonik ortalama", "speed distance time", "km/saat"],
  formulas: [
    { label: "Temel bağıntı", tex: "d = v \\times t" },
    { label: "Eşit mesafeli iki aşama için ortalama hız", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "Genel ortalama hız", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "solve", options: [["solve", "İki değerden bilinmeyeni hesaplama"], ["average", "İki aşama için ortalama hız"]] },
    { id: "speed", label: "Hız", type: "number", default: "80", when: { mode: ["solve"] }, help: "Bilinmeyen bu ise boş bırakın." },
    { id: "speedUnit", label: "Hız birimi", type: "select", default: "kmh", options: [["kmh", "km/saat"], ["ms", "metre/saniye"], ["mph", "mil/saat"]], when: { mode: ["solve"] } },
    { id: "distance", label: "Mesafe", unit: "km", type: "number", default: "120", when: { mode: ["solve"] }, help: "Bilinmeyen bu ise boş bırakın." },
    { id: "timeMode", label: "Süre formülü", type: "select", default: "decimal", options: [["decimal", "Ondalık saat"], ["hm", "Saat ve dakika"]], when: { mode: ["solve"] } },
    { id: "time", label: "Süre", unit: "saat", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "Saatler", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "Dakikalar", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "İki aşamanın verileri", type: "select", default: "speeds", options: [["speeds", "Her aşama için mesafe ve hız"], ["times", "Her aşama için mesafe ve süre"]], when: { mode: ["average"] } },
    { id: "d1", label: "Birinci aşamanın mesafesi", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "Birinci aşamanın hızı", unit: "km/saat", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "Birinci aşamanın süresi", unit: "saat", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "İkinci aşamanın mesafesi", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "İkinci aşamanın hızı", unit: "km/saat", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "İkinci aşamanın süresi", unit: "saat", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["1 saat 30 dakika"],
    note: "Örnek: 80 km/saat hızla 120 km mesafe 1 saat 30 dakika sürer."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
