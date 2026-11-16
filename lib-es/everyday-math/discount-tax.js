import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "Precio", { positive: true });
  const d1 = num(input, "discount1", "Primer descuento", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "Descuento adicional", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "Precio tras el primer descuento:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "El descuento adicional se aplica sobre el precio tras el primer descuento; los descuentos son sucesivos y no se suman:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "Importe ahorrado y porcentaje de descuento real:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "Precio final", value: money(finalPrice) },
      { label: "Importe ahorrado", value: money(saved) },
      { label: "Descuento real total", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `Precio final: ${money(finalPrice)}; importe ahorrado: ${money(saved)}; descuento real total: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "Importe", { positive: true });
  const rate = num(input, "vatRate", "Porcentaje de impuesto", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "Sentido del cálculo", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "El impuesto se calcula sobre el precio sin impuesto y se le suma:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "El precio incluye impuesto; extraemos el precio sin impuesto:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "Importe sin impuesto", value: money(net) },
      { label: "Valor del impuesto", value: money(tax) },
      { label: "Importe con impuesto", value: money(total) }
    ],
    steps,
    copy: `Sin impuesto: ${money(net)}; valor del impuesto: ${money(tax)}; con impuesto: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "Total de la factura", { positive: true });
  const tip = num(input, "tip", "Porcentaje de propina", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "Número de personas", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "Total de la factura con propina", value: money(total) },
      { label: "Parte de cada persona", value: money(share) },
      { label: "Total pagado tras redondear", value: money(collected) },
      { label: "Diferencia por redondeo", value: money(surplus) }
    ],
    steps: [
      { text: "Total de la factura con propina o servicio:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "Parte por persona antes de redondear:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "Redondeamos la parte por persona hacia arriba al céntimo más cercano:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `Total con propina: ${money(total)}; parte por persona: ${money(share)}; diferencia por redondeo: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "Redondear hacia arriba hace que el total supere la factura en menos de un céntimo por persona; esa diferencia se considera propina o se deja al restaurante." }
    ]
  };
};

export const meta = {
  description: "Calcule el precio tras uno o dos descuentos sucesivos y el importe ahorrado, el IVA añadido o extraído de un precio con impuesto, o divida una factura con propina entre varias personas.",
  keywords: ["descuento", "impuesto", "VAT", "IVA", "división de la factura", "propina", "rebaja", "discount"],
  formulas: [
    { label: "Precio tras dos descuentos sucesivos", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "Impuesto añadido (IVA)", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "Extracción del impuesto del precio con impuesto", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "Parte por persona", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "discount", options: [["discount", "Descuento"], ["vat", "Impuesto sobre el valor añadido (IVA)"], ["split", "división de la factura"]] },
    { id: "price", label: "Precio antes del descuento", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "Primer descuento", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "Descuento adicional (opcional)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "Se aplica sobre el precio tras el primer descuento." },
    { id: "vatPrice", label: "Importe", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "Porcentaje de impuesto", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "Sentido del cálculo", type: "select", default: "add", options: [["add", "Importe sin impuesto; añadir impuesto"], ["remove", "Importe con impuesto; extraer impuesto"]], when: { mode: ["vat"] } },
    { id: "bill", label: "Total de la factura", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "Porcentaje de propina o servicio", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "Número de personas", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "Ejemplo: precio de 200 con un descuento del 20% y luego un descuento adicional del 10%." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
