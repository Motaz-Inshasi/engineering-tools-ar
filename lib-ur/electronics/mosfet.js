import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "افزائشی قسم کے N-چینل MOSFET کی بنیادیں: آپریٹنگ ریجن (کٹ آف، خطی، سیچوریشن)، ڈرین کرنٹ، ٹرانس کنڈکٹنس gm اور آؤٹ پٹ مزاحمت، خصوصیاتی منحنیات کے ساتھ۔",
  keywords: ["MOSFET", "MOSFET", "فیلڈ ایفیکٹ ٹرانزسٹر", "ڈرین کرنٹ", "تھریشولڈ وولٹیج", "gm", "سیچوریشن", "خطی ریجن"],
  formulas: [
    { label: "خطی (Triode) جب VDS < VGS − Vth", tex: "I_D = k\\left[(V_{GS} - V_{th})V_{DS} - \\tfrac{1}{2}V_{DS}^2\\right]" },
    { label: "سیچوریشن جب VDS ≥ VGS − Vth", tex: "I_D = \\tfrac{1}{2}k(V_{GS} - V_{th})^2(1 + \\lambda V_{DS}),\\quad g_m = k(V_{GS} - V_{th})" }
  ],
  inputs: [
    { id: "Vgs", label: "VGS", unit: "V", type: "number", default: "3" },
    { id: "Vds", label: "VDS", unit: "V", type: "number", default: "5" },
    { id: "Vth", label: "تھریشولڈ وولٹیج Vth", unit: "V", type: "number", default: "1" },
    { id: "k", label: "ٹرانس کنڈکٹنس پیرامیٹر k = μnCox·W/L", unit: "A/V²", type: "number", default: "2m" },
    { id: "lambda", label: "چینل لینتھ ماڈیولیشن پیرامیٹر λ", unit: "1/V", type: "number", default: "0" }
  ],
  example: { values: { Vgs: "3", Vds: "5", Vth: "1", k: "2m", lambda: "0" }, expect: ["ID = 4 mA", "سیچوریشن"], note: "مثال: VGS = 3 V، Vth = 1 V اور k = 2 mA/V²۔" },
  invalid: { values: { Vgs: "3", Vds: "-5", Vth: "1", k: "2m", lambda: "0" } },
  related: ["bjt-bias", "op-amp", "voltage-regulator"]
};

export function drain(Vgs, Vds, Vth, k, lambda = 0) {
  const ov = Vgs - Vth;
  if (ov <= 0) return { region: "cutoff", Id: 0 };
  if (Vds < ov) return { region: "triode", Id: k * (ov * Vds - 0.5 * Vds * Vds) };
  return { region: "sat", Id: 0.5 * k * ov * ov * (1 + lambda * Vds) };
}

const NAMES = { cutoff: "کٹ آف", triode: "خطی (Triode)", sat: "سیچوریشن" };

export function solve(input) {
  const Vgs = num(input, "Vgs", "VGS");
  const Vds = num(input, "Vds", "VDS", { nonNegative: true });
  const Vth = num(input, "Vth", "تھریشولڈ وولٹیج", { positive: true });
  const k = num(input, "k", "k", { positive: true });
  const lambda = num(input, "lambda", "λ", { nonNegative: true, default: 0 });
  const ov = Vgs - Vth;
  const r = drain(Vgs, Vds, Vth, k, lambda);
  const steps = [{ text: "اوور ڈرائیو وولٹیج:", tex: `V_{OV} = V_{GS} - V_{th} = ${ntex(Vgs)} - ${ntex(Vth)} = ${ntex(ov, 5)}\\ V` }];
  let gm = 0, ro = Infinity, Ron = Infinity;
  if (r.region === "cutoff") steps.push("VGS تھریشولڈ وولٹیج سے کم ہے، اس لیے چینل نہیں بنتا: ٹرانزسٹر کٹ آف ہے اور ID = 0۔");
  else if (r.region === "triode") {
    Ron = 1 / (k * ov);
    steps.push(`VDS = ${fmt(Vds)} V، VOV سے کم ہے، اس لیے چینل پنچ آف نہیں ہوا: خطی ریجن۔`);
    steps.push({ tex: `I_D = ${ntex(k)}\\left[${ntex(ov, 5)} \\times ${ntex(Vds)} - \\tfrac{1}{2}(${ntex(Vds)})^2\\right] = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "چھوٹے VDS پر ٹرانزسٹر مزاحم کی طرح برتاؤ کرتا ہے:", tex: `R_{on} \\approx \\frac{1}{k V_{OV}} = ${ntex(Ron, 5)}\\ \\Omega` });
  } else {
    gm = k * ov * (1 + lambda * Vds);
    ro = lambda > 0 ? 1 / (lambda * 0.5 * k * ov * ov) : Infinity;
    steps.push(`VDS = ${fmt(Vds)} V ≥ VOV، اس لیے ڈرین پر چینل پنچ آف ہے: سیچوریشن ریجن (ایمپلیفکیشن ریجن)۔`);
    steps.push({ tex: `I_D = \\tfrac{1}{2}(${ntex(k)})(${ntex(ov, 5)})^2(1 + ${ntex(lambda)} \\times ${ntex(Vds)}) = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "چھوٹے سگنل کے پیرامیٹرز:", tex: `g_m = k V_{OV} = ${ntex(gm, 5)}\\ S${lambda > 0 ? `,\\quad r_o \\approx \\frac{1}{\\lambda I_D} = ${ntex(ro, 5)}\\ \\Omega` : ",\\quad r_o = \\infty\\ (\\lambda = 0)"}` });
  }
  const vmax = Math.max(Vds * 1.5, ov * 2, 2);
  const curves = [ov * 0.5, ov, ov * 1.5].filter((x) => x > 0).map((o) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const v = (vmax * i) / 120; pts.push([v, drain(Vth + o, v, Vth, k, lambda).Id]); }
    return { name: `VGS = ${fmt(Vth + o, 3)} V`, points: pts };
  });
  const blocks = curves.length ? [{ type: "plot", title: "ID بمقابلہ VDS کے منحنیات", xLabel: "VDS (V)", yLabel: "ID (A)", includeZero: true, series: [...curves, { name: "آپریٹنگ پوائنٹ", points: [[Vds, r.Id]], marker: "o" }] }] : [];
  return {
    results: [
      { label: "آپریٹنگ ریجن", value: NAMES[r.region], text: NAMES[r.region] },
      { label: "ڈرین کرنٹ ID", value: eng(r.Id, "A", 4), text: `ID = ${eng(r.Id, "A", 4)}` },
      { label: "ٹرانس کنڈکٹنس gm", value: eng(gm, "S", 4) },
      ...(r.region === "triode" ? [{ label: "آن ریزسٹنس Ron", value: eng(Ron, "Ω", 4) }] : []),
      { label: "ضائع ہونے والی طاقت", value: eng(r.Id * Vds, "W", 4) }
    ],
    blocks, steps, copy: `${NAMES[r.region]}: ID = ${eng(r.Id, "A", 4)}, gm = ${eng(gm, "S", 4)}`
  };
}
