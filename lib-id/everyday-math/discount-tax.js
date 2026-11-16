import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "Harga", { positive: true });
  const d1 = num(input, "discount1", "Diskon pertama", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "Diskon tambahan", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "Harga setelah diskon pertama:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "Diskon tambahan diterapkan pada harga setelah diskon pertama, sehingga diskon berurutan dan tidak dijumlahkan:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "Jumlah hemat dan persentase diskon efektif:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "Harga akhir", value: money(finalPrice) },
      { label: "Jumlah hemat", value: money(saved) },
      { label: "Total diskon efektif", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `Harga akhir: ${money(finalPrice)}, jumlah hemat: ${money(saved)}, total diskon efektif: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "Jumlah", { positive: true });
  const rate = num(input, "vatRate", "Persentase pajak", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "Arah perhitungan", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "Pajak dihitung dari harga sebelum pajak dan ditambahkan padanya:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "Harga sudah termasuk pajak, sehingga kita keluarkan harga sebelum pajak:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "Jumlah sebelum pajak", value: money(net) },
      { label: "Nilai pajak", value: money(tax) },
      { label: "Jumlah termasuk pajak", value: money(total) }
    ],
    steps,
    copy: `Sebelum pajak: ${money(net)}, nilai pajak: ${money(tax)}, termasuk pajak: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "Total tagihan", { positive: true });
  const tip = num(input, "tip", "Persentase tip", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "Jumlah orang", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "Total tagihan dengan tip", value: money(total) },
      { label: "Bagian setiap orang", value: money(share) },
      { label: "Total terkumpul setelah pembulatan", value: money(collected) },
      { label: "Selisih pembulatan", value: money(surplus) }
    ],
    steps: [
      { text: "Total tagihan dengan tip atau layanan:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "Bagian per orang sebelum pembulatan:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "Kita bulatkan bagian per orang ke atas hingga sen terdekat:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `Total tagihan dengan tip: ${money(total)}, bagian setiap orang: ${money(share)}, selisih pembulatan: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "Pembulatan ke atas membuat jumlah lebih besar dari tagihan dengan selisih tidak lebih dari satu sen per orang; selisih ini dianggap sebagai tip atau diberikan kepada restoran." }
    ]
  };
};

export const meta = {
  description: "Hitung harga setelah satu atau dua diskon berurutan dan jumlah hemat, atau pajak pertambahan nilai yang ditambahkan dan dikeluarkan dari harga termasuk pajak, atau bagi tagihan dengan tip ke sejumlah orang.",
  keywords: ["diskon", "pajak", "VAT", "pajak pertambahan nilai", "pembagian tagihan", "tip", "potongan harga", "discount"],
  formulas: [
    { label: "Harga setelah dua diskon berurutan", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "Pajak pertambahan nilai", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "Mengeluarkan pajak dari harga termasuk pajak", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "Bagian per orang", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "discount", options: [["discount", "Diskon"], ["vat", "Pajak pertambahan nilai (PPN)"], ["split", "pembagian tagihan"]] },
    { id: "price", label: "Harga sebelum diskon", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "Diskon pertama", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "Diskon tambahan (opsional)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "Diterapkan pada harga setelah diskon pertama." },
    { id: "vatPrice", label: "Jumlah", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "Persentase pajak", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "Arah perhitungan", type: "select", default: "add", options: [["add", "Jumlah sebelum pajak, tambahkan pajaknya"], ["remove", "Jumlah termasuk pajak, keluarkan pajaknya"]], when: { mode: ["vat"] } },
    { id: "bill", label: "Total tagihan", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "Persentase tip atau layanan", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "Jumlah orang", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "Contoh: harga 200 dengan diskon 20% lalu diskon tambahan 10%." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
