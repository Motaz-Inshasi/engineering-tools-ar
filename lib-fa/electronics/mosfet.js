import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "مبانی MOSFET کانال N از نوع تقویتی: ناحیه‌های کاری (قطع، خطی، اشباع)، جریان درین، هدایت متقابل gm و مقاومت خروجی، همراه با منحنی‌های مشخصه.",
  keywords: ["MOSFET", "MOSFET", "ترانزیستور اثر میدانی", "جریان درین", "ولتاژ آستانه", "gm", "اشباع", "ناحیهٔ خطی"],
  formulas: [
    { label: "خطی (Triode) وقتی VDS < VGS − Vth", tex: "I_D = k\\left[(V_{GS} - V_{th})V_{DS} - \\tfrac{1}{2}V_{DS}^2\\right]" },
    { label: "اشباع وقتی VDS ≥ VGS − Vth", tex: "I_D = \\tfrac{1}{2}k(V_{GS} - V_{th})^2(1 + \\lambda V_{DS}),\\quad g_m = k(V_{GS} - V_{th})" }
  ],
  inputs: [
    { id: "Vgs", label: "VGS", unit: "V", type: "number", default: "3" },
    { id: "Vds", label: "VDS", unit: "V", type: "number", default: "5" },
    { id: "Vth", label: "ولتاژ آستانه Vth", unit: "V", type: "number", default: "1" },
    { id: "k", label: "پارامتر هدایت k = μnCox·W/L", unit: "A/V²", type: "number", default: "2m" },
    { id: "lambda", label: "ضریب مدولاسیون طول کانال λ", unit: "1/V", type: "number", default: "0" }
  ],
  example: { values: { Vgs: "3", Vds: "5", Vth: "1", k: "2m", lambda: "0" }, expect: ["ID = 4 mA", "اشباع"], note: "مثال: VGS = 3 V و Vth = 1 V و k = 2 mA/V²." },
  invalid: { values: { Vgs: "3", Vds: "-5", Vth: "1", k: "2m", lambda: "0" } },
  related: ["bjt-bias", "op-amp", "voltage-regulator"]
};

export function drain(Vgs, Vds, Vth, k, lambda = 0) {
  const ov = Vgs - Vth;
  if (ov <= 0) return { region: "cutoff", Id: 0 };
  if (Vds < ov) return { region: "triode", Id: k * (ov * Vds - 0.5 * Vds * Vds) };
  return { region: "sat", Id: 0.5 * k * ov * ov * (1 + lambda * Vds) };
}

const NAMES = { cutoff: "قطع", triode: "خطی (Triode)", sat: "اشباع (Saturation)" };

export function solve(input) {
  const Vgs = num(input, "Vgs", "VGS");
  const Vds = num(input, "Vds", "VDS", { nonNegative: true });
  const Vth = num(input, "Vth", "ولتاژ آستانه", { positive: true });
  const k = num(input, "k", "k", { positive: true });
  const lambda = num(input, "lambda", "λ", { nonNegative: true, default: 0 });
  const ov = Vgs - Vth;
  const r = drain(Vgs, Vds, Vth, k, lambda);
  const steps = [{ text: "ولتاژ اضافه‌بار (Overdrive):", tex: `V_{OV} = V_{GS} - V_{th} = ${ntex(Vgs)} - ${ntex(Vth)} = ${ntex(ov, 5)}\\ V` }];
  let gm = 0, ro = Infinity, Ron = Infinity;
  if (r.region === "cutoff") steps.push("اگر VGS کمتر از ولتاژ آستانه باشد، کانالی شکل نمی‌گیرد: ترانزیستور قطع است و ID = 0.");
  else if (r.region === "triode") {
    Ron = 1 / (k * ov);
    steps.push(`VDS = ${fmt(Vds)} V کمتر از VOV است، پس کانال تنگ نشده است: ناحیهٔ خطی.`);
    steps.push({ tex: `I_D = ${ntex(k)}\\left[${ntex(ov, 5)} \\times ${ntex(Vds)} - \\tfrac{1}{2}(${ntex(Vds)})^2\\right] = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "در VDS کوچک، ترانزیستور مانند یک مقاومت رفتار می‌کند:", tex: `R_{on} \\approx \\frac{1}{k V_{OV}} = ${ntex(Ron, 5)}\\ \\Omega` });
  } else {
    gm = k * ov * (1 + lambda * Vds);
    ro = lambda > 0 ? 1 / (lambda * 0.5 * k * ov * ov) : Infinity;
    steps.push(`VDS = ${fmt(Vds)} V بزرگ‌تر یا برابر VOV است، پس کانال در درین تنگ شده است: ناحیهٔ اشباع (ناحیهٔ تقویت).`);
    steps.push({ tex: `I_D = \\tfrac{1}{2}(${ntex(k)})(${ntex(ov, 5)})^2(1 + ${ntex(lambda)} \\times ${ntex(Vds)}) = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "پارامترهای سیگنال کوچک:", tex: `g_m = k V_{OV} = ${ntex(gm, 5)}\\ S${lambda > 0 ? `,\\quad r_o \\approx \\frac{1}{\\lambda I_D} = ${ntex(ro, 5)}\\ \\Omega` : ",\\quad r_o = \\infty\\ (\\lambda = 0)"}` });
  }
  const vmax = Math.max(Vds * 1.5, ov * 2, 2);
  const curves = [ov * 0.5, ov, ov * 1.5].filter((x) => x > 0).map((o) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const v = (vmax * i) / 120; pts.push([v, drain(Vth + o, v, Vth, k, lambda).Id]); }
    return { name: `VGS = ${fmt(Vth + o, 3)} V`, points: pts };
  });
  const blocks = curves.length ? [{ type: "plot", title: "منحنی‌های ID بر حسب VDS", xLabel: "VDS (V)", yLabel: "ID (A)", includeZero: true, series: [...curves, { name: "نقطهٔ کار", points: [[Vds, r.Id]], marker: "o" }] }] : [];
  return {
    results: [
      { label: "ناحیهٔ کاری", value: NAMES[r.region], text: NAMES[r.region] },
      { label: "جریان درین ID", value: eng(r.Id, "A", 4), text: `ID = ${eng(r.Id, "A", 4)}` },
      { label: "هدایت متقابل gm", value: eng(gm, "S", 4) },
      ...(r.region === "triode" ? [{ label: "مقاومت هدایت Ron", value: eng(Ron, "Ω", 4) }] : []),
      { label: "توان تلف‌شده", value: eng(r.Id * Vds, "W", 4) }
    ],
    blocks, steps, copy: `${NAMES[r.region]}: ID = ${eng(r.Id, "A", 4)}, gm = ${eng(gm, "S", 4)}`
  };
}
