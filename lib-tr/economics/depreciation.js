import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Varlığın yıllık amortismanını doğrusal yöntem, azalan bakiye veya yıllar toplamı yöntemiyle hesaplayın; hurda değerin altına inmeden amortisman, birikmiş amortisman ve defter değerini gösteren bir tablo ekleyin.",
  keywords: ["Amortisman", "Amortisman", "depreciation", "Doğrusal yöntem", "Azalan bakiye yöntemi", "Yıllar toplamı yöntemi", "Defter değeri", "Hurda değeri"],
  formulas: [
    { label: "Doğrusal yöntem", tex: "D = \\frac{C-S}{n}" },
    { label: "Yıllar toplamı yöntemi", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "Azalan bakiye yöntemi", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "Varlık maliyeti C", type: "number", default: "10000" },
    { id: "salvage", label: "Hurda değeri S", type: "number", default: "1000" },
    { id: "life", label: "Faydalı ömür n", unit: "yıl", type: "number", default: "5", help: "1 ile 100 arasında bir tam sayı." },
    { id: "method", label: "Amortisman yöntemi", type: "select", default: "sl", options: [["sl", "Doğrusal yöntem"], ["db", "Azalan bakiye yöntemi"], ["syd", "Yıllar toplamı yöntemi"]] },
    { id: "factor", label: "Azalan bakiye katsayısı k", type: "select", default: "2", options: [["2", "Katsayı (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "Örnek: maliyeti 10.000, hurda değeri 1.000 ve ömrü 5 yıl olan bir varlık için doğrusal yöntem." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "Varlık maliyeti", { positive: true });
  const salvage = num(input, "salvage", "Hurda değeri", { nonNegative: true });
  const n = num(input, "life", "Faydalı ömür", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "Amortisman yöntemi", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "Azalan bakiye katsayısı", ["2", "1.5"], "2"));
  if (salvage > cost) fail("Hurda değeri varlık maliyetini aşamaz.", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "Doğrusal" : "Azalan";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["Yıl", "Amortisman", "Birikmiş", "Defter değeri"];
  if (withKind) head.push("Yöntem");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "Birinci yıl amortismanı", value: money(first) },
    { label: "Toplam amortisman", value: money(base) },
    { label: "Ömür sonundaki defter değeri", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "Yıllık sabit amortisman", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "Doğrusal amortisman:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "Yıllar toplamı:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "Birinci yıl amortismanı:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "Azalan bakiye oranı:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "Birinci yıl amortismanı:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("Her yılda, azalan bakiye ile kalan değer üzerinden doğrusal amortisman arasındaki büyük olan alınır ve hurda değeri aşılmaz.");
  }
  const copy = method === "sl"
    ? `Yıllık sabit amortisman: ${money(base / n)}, ömür sonundaki defter değeri: ${money(last)}`
    : `Birinci yıl amortismanı: ${money(first)}, ömür sonundaki defter değeri: ${money(last)}`;
  const blocks = [{ type: "table", caption: "Yıllık amortisman tablosu", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "Hesaplama doğrusal yönteme geçmeyi gerektirmedi; defter değeri hurda değerinin altına inmez." }
      : { type: "note", text: `Hesaplama ${switchYear}. yıldan itibaren doğrusal yönteme geçer, çünkü kalan değer üzerinden doğrusal amortisman daha büyüktür; böylece ömür sonunda defter değeri hurda değerine eşit olur ve altına inmez.` });
  }
  return { results, steps, copy, blocks };
}
