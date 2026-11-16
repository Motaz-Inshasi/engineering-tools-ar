import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "وولٹیج ڈیوائیڈر یا مقررہ بائیس کے ذریعے NPN قسم کے BJT ٹرانزسٹر کے بائیس کا تجزیہ کریں: بیس، کلیکٹر اور ایمیٹر کے کرنٹ، VCE وولٹیج، آپریٹنگ پوائنٹ اور آپریٹنگ ریجن (فعال، سیچوریشن، کٹ آف)۔",
  keywords: ["ٹرانزسٹر", "BJT", "بائیس", "bias", "آپریٹنگ پوائنٹ", "Q-point", "وولٹیج ڈیوائیڈر", "سیچوریشن", "beta"],
  formulas: [
    { label: "وولٹیج ڈیوائیڈر بائیس (بیس پر تھیوینن مساوی)", tex: "V_{BB} = V_{CC}\\frac{R_2}{R_1 + R_2},\\quad R_{BB} = R_1 \\parallel R_2,\\quad I_B = \\frac{V_{BB} - V_{BE}}{R_{BB} + (\\beta + 1)R_E}" },
    { label: "آپریٹنگ پوائنٹ", tex: "I_C = \\beta I_B,\\quad V_{CE} = V_{CC} - I_C R_C - I_E R_E" }
  ],
  inputs: [
    { id: "cfg", label: "بائیس کا طریقہ", type: "select", default: "divider", options: [["divider", "وولٹیج ڈیوائیڈر"], ["fixed", "مقررہ بائیس (RB)"]] },
    { id: "Vcc", label: "VCC", unit: "V", type: "number", default: "12" },
    { id: "R1", label: "R1 (VCC سے بیس تک)", unit: "Ω", type: "number", default: "47k", when: { cfg: ["divider"] } },
    { id: "R2", label: "R2 (بیس سے زمین تک)", unit: "Ω", type: "number", default: "10k", when: { cfg: ["divider"] } },
    { id: "RB", label: "RB", unit: "Ω", type: "number", default: "470k", when: { cfg: ["fixed"] } },
    { id: "RC", label: "RC", unit: "Ω", type: "number", default: "2.2k" },
    { id: "RE", label: "RE", unit: "Ω", type: "number", default: "470" },
    { id: "beta", label: "کرنٹ گین β", type: "number", default: "100" },
    { id: "Vbe", label: "VBE", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100", Vbe: "0.7" }, expect: ["IC = 2.522 mA", "VCE = 5.254 V"], note: "مثال: 12 V سے 47k/10k ڈیوائیڈر، RC = 2.2k، RE = 470 Ω، اور β = 100۔" },
  invalid: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "0", Vbe: "0.7" } },
  related: ["mosfet", "op-amp", "thevenin-norton", "voltage-current-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "بائیس کا طریقہ", ["divider", "fixed"], "divider");
  const Vcc = num(input, "Vcc", "VCC", { positive: true });
  const RC = num(input, "RC", "RC", { nonNegative: true });
  const RE = num(input, "RE", "RE", { nonNegative: true });
  const beta = num(input, "beta", "β", { positive: true });
  const Vbe = num(input, "Vbe", "VBE", { nonNegative: true, default: 0.7 });
  const VCEsat = 0.2;
  let VBB, RBB;
  const steps = [];
  if (cfg === "divider") {
    const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
    VBB = (Vcc * R2) / (R1 + R2);
    RBB = (R1 * R2) / (R1 + R2);
    steps.push({ text: "ہم ڈیوائیڈر کو بیس پر اس کے تھیوینن مساوی سے بدل دیتے ہیں:", tex: `V_{BB} = ${ntex(Vcc)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(VBB, 5)}\\ V,\\quad R_{BB} = ${ntex(RBB, 5)}\\ \\Omega` });
  } else {
    VBB = Vcc;
    RBB = num(input, "RB", "RB", { positive: true });
    steps.push(`مقررہ بائیس میں بیس RB کے ذریعے براہِ راست VCC سے جڑا ہوتا ہے۔`);
  }
  let IB = (VBB - Vbe) / (RBB + (beta + 1) * RE);
  steps.push({ text: "بیس-ایمیٹر لوپ مساوات (KVL):", tex: `I_B = \\frac{${ntex(VBB, 5)} - ${ntex(Vbe)}}{${ntex(RBB, 5)} + (${ntex(beta)} + 1)(${ntex(RE)})} = ${ntex(IB, 5)}\\ A` });
  let region, IC, IE, VCE, VE, VC, VB;
  if (IB <= 0) {
    region = "کٹ آف";
    IB = 0; IC = 0; IE = 0; VE = 0; VC = Vcc; VCE = Vcc; VB = VBB;
    steps.push("بیس وولٹیج بیس-ایمیٹر جنکشن کو فارورڈ بائیس کرنے کے لیے کافی نہیں ہے، اس لیے ٹرانزسٹر کٹ آف ریجن میں ہے۔");
  } else {
    IC = beta * IB; IE = IC + IB;
    VCE = Vcc - IC * RC - IE * RE;
    region = "فعال";
    if (VCE < VCEsat) {
      region = "سیچوریشن";
      IC = (Vcc - VCEsat - IB * RE) / (RC + RE);
      if (IC < 0) IC = 0;
      IE = IC + IB;
      VCE = VCEsat;
      steps.push(`فعال ریجن کے حساب سے VCE منفی یا ${VCEsat} V سے کم آیا، اس لیے ٹرانزسٹر سیچوریشن میں ہے: ہم VCE = ${VCEsat} V طے کرتے ہیں اور کلیکٹر لوپ سے IC نکالتے ہیں، کیونکہ IC = βIB اب درست نہیں رہتا۔`);
    } else steps.push({ text: "فعال ریجن میں:", tex: `I_C = \\beta I_B = ${ntex(IC, 5)}\\ A,\\quad V_{CE} = ${ntex(Vcc)} - I_C(${ntex(RC)}) - I_E(${ntex(RE)}) = ${ntex(VCE, 5)}\\ V` });
    VE = IE * RE; VC = VE + VCE; VB = VE + Vbe;
  }
  const IcSat = (Vcc - VCEsat) / (RC + RE || 1e-30);
  steps.push(`ڈی سی لوڈ لائن محوروں کو $I_{C,sat} \\approx ${ntex(IcSat, 4)}$ A اور $V_{CE,cutoff} = ${ntex(Vcc)}$ V پر قطع کرتی ہے، اور آپریٹنگ پوائنٹ اسی پر واقع ہے۔`);
  return {
    results: [
      { label: "آپریٹنگ ریجن", value: region },
      { label: "IB", value: eng(IB, "A", 4) },
      { label: "IC", value: eng(IC, "A", 4), text: `IC = ${eng(IC, "A", 4)}` },
      { label: "IE", value: eng(IE, "A", 4) },
      { label: "VCE", value: eng(VCE, "V", 4), text: `VCE = ${eng(VCE, "V", 4)}` },
      { label: "ٹرمینل وولٹیجز VB / VC / VE", value: `${fmt(VB, 4)} / ${fmt(VC, 4)} / ${fmt(VE, 4)} V` },
      { label: "ٹرانزسٹر کی طاقت", value: eng(VCE * IC, "W", 4) }
    ],
    blocks: [{ type: "plot", title: "لوڈ لائن اور آپریٹنگ پوائنٹ", xLabel: "VCE (V)", yLabel: "IC (A)", includeZero: true, series: [{ name: "لوڈ لائن", points: [[0, IcSat + VCEsat / (RC + RE || 1e-30)], [Vcc, 0]] }, { name: "Q", points: [[VCE, IC]], marker: "o" }] }],
    steps, copy: `${region}: IC = ${eng(IC, "A", 4)}, VCE = ${eng(VCE, "V", 4)}, IB = ${eng(IB, "A", 4)}`
  };
}
