import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "Price", { positive: true });
  const d1 = num(input, "discount1", "First discount", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "Additional discount", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "Price after the first discount:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "The additional discount is applied to the price after the first discount, so the discounts are successive and are not added together:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "Amount saved and effective discount rate:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "Final price", value: money(finalPrice) },
      { label: "Amount saved", value: money(saved) },
      { label: "Total effective discount", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `Final price: ${money(finalPrice)}, amount saved: ${money(saved)}, total effective discount: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "Amount", { positive: true });
  const rate = num(input, "vatRate", "Tax rate", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "Calculation direction", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "The tax is calculated on the price before tax and added to it:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "The price includes tax, so we extract the price before tax:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "Amount before tax", value: money(net) },
      { label: "Tax amount", value: money(tax) },
      { label: "Amount including tax", value: money(total) }
    ],
    steps,
    copy: `Before tax: ${money(net)}, tax amount: ${money(tax)}, including tax: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "Bill total", { positive: true });
  const tip = num(input, "tip", "Tip rate", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "Number of people", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "Bill total with tip", value: money(total) },
      { label: "Share per person", value: money(share) },
      { label: "Total paid after rounding", value: money(collected) },
      { label: "Rounding difference", value: money(surplus) }
    ],
    steps: [
      { text: "Bill total with tip or service charge:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "Share per person before rounding:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "Round the share per person up to the nearest cent:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `Bill total with tip: ${money(total)}, share per person: ${money(share)}, rounding difference: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "Rounding up makes the total greater than the bill by a difference of no more than one cent per person; this difference counts as a tip or is left to the restaurant." }
    ]
  };
};

export const meta = {
  description: "Calculate the price after one or two successive discounts and the amount saved, or the value added tax and its extraction from a price that includes tax, or split a bill with a tip among a number of people.",
  keywords: ["discount", "tax", "VAT", "value added tax", "bill split", "tip", "reduction", "discount"],
  formulas: [
    { label: "Price after two successive discounts", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "Value added tax", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "Extracting tax from a price that includes tax", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "Share per person", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "discount", options: [["discount", "Discount"], ["vat", "Value added tax"], ["split", "bill split"]] },
    { id: "price", label: "Price before discount", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "First discount", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "Additional discount (optional)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "Applied to the price after the first discount." },
    { id: "vatPrice", label: "Amount", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "Tax rate", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "Calculation direction", type: "select", default: "add", options: [["add", "Amount before tax, add tax"], ["remove", "Amount including tax, extract tax"]], when: { mode: ["vat"] } },
    { id: "bill", label: "Bill total", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "Tip or service charge rate", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "Number of people", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "Example: a price of 200 with a 20% discount, then an additional 10% discount." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
