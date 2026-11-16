import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "Prix", { positive: true });
  const d1 = num(input, "discount1", "Première remise", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "Remise supplémentaire", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "Prix après la première remise :", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "La remise supplémentaire s'applique au prix après la première remise : les remises sont donc successives et ne s'additionnent pas :", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "Montant économisé et taux de remise effectif :", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "Prix final", value: money(finalPrice) },
      { label: "Montant économisé", value: money(saved) },
      { label: "Remise effective totale", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `Prix final : ${money(finalPrice)}, montant économisé : ${money(saved)}, remise effective totale : ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "Montant", { positive: true });
  const rate = num(input, "vatRate", "Taux de la taxe", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "Sens du calcul", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "La taxe est calculée sur le prix hors taxe et ajoutée à celui-ci :", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "Le prix comprend la taxe ; on en extrait donc le prix hors taxe :", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "Montant hors taxe", value: money(net) },
      { label: "Montant de la taxe", value: money(tax) },
      { label: "Montant TTC", value: money(total) }
    ],
    steps,
    copy: `Hors taxe : ${money(net)}, montant de la taxe : ${money(tax)}, TTC : ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "Total de la facture", { positive: true });
  const tip = num(input, "tip", "Taux du pourboire", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "Nombre de personnes", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "Total de la facture avec pourboire", value: money(total) },
      { label: "Part de chaque personne", value: money(share) },
      { label: "Total payé après arrondi", value: money(collected) },
      { label: "Écart d'arrondi", value: money(surplus) }
    ],
    steps: [
      { text: "Total de la facture avec pourboire ou frais de service :", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "Part par personne avant arrondi :", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "On arrondit la part par personne au centime supérieur :", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `Total de la facture avec pourboire : ${money(total)}, part de chaque personne : ${money(share)}, écart d'arrondi : ${money(surplus)}`,
    blocks: [
      { type: "note", text: "L'arrondi par excès rend le total supérieur à la facture d'un écart inférieur ou égal à un centime par personne ; cet écart compte comme un pourboire ou reste au restaurant." }
    ]
  };
};

export const meta = {
  description: "Calcule le prix après une ou deux remises successives et le montant économisé, ou la TVA ajoutée et son extraction à partir d'un prix TTC, ou répartit une facture avec pourboire entre plusieurs personnes.",
  keywords: ["remise", "taxe", "VAT", "taxe sur la valeur ajoutée", "répartition de la facture", "pourboire", "réduction", "discount"],
  formulas: [
    { label: "Prix après deux remises successives", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "Taxe sur la valeur ajoutée", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "Extraction de la taxe à partir du prix TTC", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "Part par personne", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "discount", options: [["discount", "Remise"], ["vat", "Taxe sur la valeur ajoutée (TVA)"], ["split", "répartition de la facture"]] },
    { id: "price", label: "Prix avant remise", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "Première remise", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "Remise supplémentaire (facultatif)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "S'applique au prix après la première remise." },
    { id: "vatPrice", label: "Montant", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "Taux de la taxe", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "Sens du calcul", type: "select", default: "add", options: [["add", "Montant hors taxe, ajouter la taxe"], ["remove", "Montant TTC, extraire la taxe"]], when: { mode: ["vat"] } },
    { id: "bill", label: "Total de la facture", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "Taux du pourboire ou des frais de service", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "Nombre de personnes", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "Exemple : prix de 200 avec une remise de 20 %, puis une remise supplémentaire de 10 %." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
