import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "سیستم‌های سه‌فاز متعادل با اتصال ستاره یا مثلث: ولتاژ و جریان فاز و خط، توان اکتیو، راکتیو و ظاهری و ضریب توان، از روی ولتاژ خط و امپدانس بار هر فاز.",
  keywords: ["سه‌فاز", "سه فاز", "three phase", "ستاره", "مثلث", "star", "delta", "ولتاژ خط", "جریان خط", "√3"],
  formulas: [
    { label: "ستاره (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "مثلث (Δ) و توان کل", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "اتصال بار", type: "select", default: "star", options: [["star", "ستاره (Y)"], ["delta", "مثلث (Δ)"]] },
    { id: "VL", label: "ولتاژ خط (مؤثر)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "امپدانس بار برای هر فاز", unit: "Ω", type: "text", default: "8+6j", help: "مستطیلی مانند 8+6j، یا قطبی مانند 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "مثال: بار ستاره 8+6j اهم در شبکه 400 ولت." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "اتصال", ["star", "delta"], "star");
  const VL = num(input, "VL", "ولتاژ خط", { positive: true });
  const Z = readComplex(input, "Z", "امپدانس");
  if (cabs(Z) === 0) fail("امپدانس فاز نمی‌تواند صفر باشد.", "Z");
  if (Z.re < 0) fail("قسمت حقیقی امپدانس برای بار غیرفعال نمی‌تواند منفی باشد.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "در ستاره ولتاژ فاز به اندازه √3 کمتر از ولتاژ خط است:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "در مثلث ولتاژ فاز برابر ولتاژ خط است.",
    { text: "جریان فاز از قانون اهم:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "در ستاره جریان خط برابر جریان فاز است." : { text: "در مثلث جریان خط به اندازه √3 بیشتر است:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "توان کل سه فاز:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "ولتاژ فاز", value: eng(Vph, "V", 5) },
      { label: "جریان فاز", value: eng(Iph, "A", 5) },
      { label: "جریان خط", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "توان اکتیو P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "توان راکتیو Q", value: eng(Q, "VAR", 4) },
      { label: "توان ظاهری S", value: eng(S, "VA", 4) },
      { label: "ضریب توان", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "پسفاز" : th < 0 ? "پیشفاز" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (مقیاس‌شده)`, { re: c.re * scale, im: c.im * scale }])], "ولتاژهای فاز و جریان‌های آن")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
