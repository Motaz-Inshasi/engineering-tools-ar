import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "Fiyat", { positive: true });
  const d1 = num(input, "discount1", "Birinci indirim", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "Ek indirim", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "Birinci indirimden sonraki fiyat:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "Ek indirim, birinci indirimden sonraki fiyata uygulanır; indirimler art arda uygulanır ve toplanmaz:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "Kazanılan tutar ve gerçek indirim oranı:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "Son fiyat", value: money(finalPrice) },
      { label: "Kazanılan tutar", value: money(saved) },
      { label: "Toplam gerçek indirim", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `Son fiyat: ${money(finalPrice)}, kazanılan tutar: ${money(saved)}, toplam gerçek indirim: %${fmt(effective, 6)}`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "Tutar", { positive: true });
  const rate = num(input, "vatRate", "Vergi oranı", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "Hesaplama yönü", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "Vergi, vergisiz fiyat üzerinden hesaplanıp eklenir:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "Fiyat vergi dahil; vergisiz fiyatı buluyoruz:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "Vergisiz tutar", value: money(net) },
      { label: "Vergi tutarı", value: money(tax) },
      { label: "Vergi dahil tutar", value: money(total) }
    ],
    steps,
    copy: `Vergisiz: ${money(net)}, vergi tutarı: ${money(tax)}, vergi dahil: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "Fatura toplamı", { positive: true });
  const tip = num(input, "tip", "Bahşiş oranı", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "Kişi sayısı", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "Bahşişli fatura toplamı", value: money(total) },
      { label: "Kişi başı pay", value: money(share) },
      { label: "Yuvarlamadan sonra ödenen toplam", value: money(collected) },
      { label: "Yuvarlama farkı", value: money(surplus) }
    ],
    steps: [
      { text: "Bahşiş veya servis ücretiyle fatura toplamı:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "Yuvarlamadan önce kişi payı:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "Kişi payı en yakın kuruşa yukarı yuvarlanır:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `Bahşişli fatura toplamı: ${money(total)}, kişi başı pay: ${money(share)}, yuvarlama farkı: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "Yukarı yuvarlama, toplamı faturadan kişi başına bir kuruştan fazla olmayan bir farkla büyütür; bu fark bahşiş sayılır veya restorana bırakılır." }
    ]
  };
};

export const meta = {
  description: "Art arda uygulanan bir veya iki indirimden sonraki fiyatı ve kazanılan tutarı hesaplayın; vergi dahil fiyattan vergiyi çıkarın ya da bahşişli faturayı kişi sayısına bölün.",
  keywords: ["İndirim", "Vergi", "VAT", "Katma değer", "Faturayı bölme", "Bahşiş", "İndirim", "discount"],
  formulas: [
    { label: "İki art arda indirimden sonraki fiyat", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "Katma değer vergisi", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "Vergi dahil fiyattan vergiyi çıkarma", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "Kişi başı pay", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "discount", options: [["discount", "İndirim"], ["vat", "Katma değer vergisi (KDV)"], ["split", "Faturayı bölme"]] },
    { id: "price", label: "İndirim öncesi fiyat", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "Birinci indirim", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "Ek indirim (isteğe bağlı)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "Birinci indirimden sonraki fiyata uygulanır." },
    { id: "vatPrice", label: "Tutar", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "Vergi oranı", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "Hesaplama yönü", type: "select", default: "add", options: [["add", "Vergisiz tutar, vergiyi ekleyin"], ["remove", "Vergi dahil tutar, vergiyi çıkarın"]], when: { mode: ["vat"] } },
    { id: "bill", label: "Fatura toplamı", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "Bahşiş veya servis oranı", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "Kişi sayısı", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "Örnek: 200 fiyat, %20 indirim ve ardından %10 ek indirim." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
