import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { ctex, cfmt, cpolarText, cpolarTex, cmul, cdiv, csub, cabs } from "../core/complex.js";
import { C, zR, zL, zC, zsum, zpar, deg, phasorBlock, scaleList, cadd } from "./common.js";

export const meta = {
  description: "حلّل دائرة RLC على التوالي أو التوازي بمصدر جيبي: الممانعة الكلية والتيار والجهود والتيارات لكل عنصر بالطور، ومعامل القدرة والقدرات الثلاث، مع مخطط الطور والتحقق بكيرشوف.",
  keywords: ["دائرة RLC", "RLC", "توالي", "توازي", "ممانعة كلية", "مخطط الطور", "phasor diagram", "معامل القدرة"],
  formulas: [
    { label: "التوالي والتوازي", tex: "Z_s = R + j\\left(\\omega L - \\frac{1}{\\omega C}\\right),\\qquad \\frac{1}{Z_p} = \\frac{1}{R} + \\frac{1}{j\\omega L} + j\\omega C" },
    { label: "التيار والقدرة", tex: "\\mathbf{I} = \\frac{\\mathbf{V}}{Z},\\qquad S = \\mathbf{V}\\mathbf{I}^* = P + jQ,\\qquad PF = \\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "التوصيل", type: "select", default: "series", options: [["series", "توالي"], ["parallel", "توازي"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "30" },
    { id: "L", label: "L", unit: "H", type: "number", default: "100m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u" },
    { id: "f", label: "التردد f", unit: "Hz", type: "number", default: "50" },
    { id: "V", label: "جهد المصدر (قيمة فعالة)", unit: "V", type: "number", default: "230" }
  ],
  example: { values: { conn: "series", R: "30", L: "100m", C: "100u", f: "50", V: "230" }, expect: ["|Z| = 30.0"], note: "مثال: دائرة توالي عند 50 Hz قريبة من الرنين." },
  invalid: { values: { conn: "series", R: "30", L: "100m", C: "0", f: "50", V: "230" } },
  related: ["resonance", "impedance", "complex-power", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "التوصيل", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const f = num(input, "f", "التردد", { positive: true }), Vm = num(input, "V", "الجهد", { positive: true });
  const w = 2 * Math.PI * f;
  const ZR = zR(R), ZL = zL(L, w), ZC = zC(Cap, w);
  const V = C(Vm, 0);
  const steps = [{ text: "ممانعة كل عنصر:", tex: `Z_R = ${ntex(R)},\\quad Z_L = j${ntex(ZL.im, 6)},\\quad Z_C = -j${ntex(-ZC.im, 6)}\\ \\Omega` }];
  let Z, I, rows, check, diagram;
  if (conn === "series") {
    Z = zsum(ZR, ZL, ZC);
    I = cdiv(V, Z);
    const VR = cmul(I, ZR), VL = cmul(I, ZL), VC = cmul(I, ZC);
    steps.push({ text: "على التوالي نجمع الممانعات:", tex: `Z = ${ntex(R)} + j(${ntex(ZL.im, 6)} - ${ntex(-ZC.im, 6)}) = ${ctex(Z, 6)}\\ \\Omega` });
    steps.push({ text: "التيار (نأخذ جهد المصدر مرجعاً بزاوية 0°):", tex: `\\mathbf{I} = \\frac{${ntex(Vm)}\\angle 0^\\circ}{${ctex(Z, 6)}} = ${ntex(cabs(I), 6)}\\angle ${ntex(deg(I), 5)}^\\circ\\ A` });
    steps.push("جهد كل عنصر = التيار × ممانعته (انظر الجدول). جهد الملف والمكثف قد يتجاوزان جهد المصدر قرب الرنين.");
    rows = [["R", { tex: cpolarTex(VR, 5) }, { tex: cpolarTex(I, 5) }], ["L", { tex: cpolarTex(VL, 5) }, { tex: cpolarTex(I, 5) }], ["C", { tex: cpolarTex(VC, 5) }, { tex: cpolarTex(I, 5) }]];
    check = cabs(csub(cadd(cadd(VR, VL), VC), V));
    steps.push(`تحقق KVL بالطور: $\\mathbf{V}_R + \\mathbf{V}_L + \\mathbf{V}_C - \\mathbf{V} = ${ntex(check, 2)}\\ V$.`);
    diagram = scaleList([["V", V], ["I", I], ["VR", VR], ["VL", VL], ["VC", VC]]);
  } else {
    Z = zpar(ZR, ZL, ZC);
    I = cdiv(V, Z);
    const IR = cdiv(V, ZR), IL = cdiv(V, ZL), IC = cdiv(V, ZC);
    steps.push({ text: "على التوازي نجمع المسامحات:", tex: `Y = \\frac{1}{${ntex(R)}} - \\frac{j}{${ntex(ZL.im, 6)}} + \\frac{j}{${ntex(-ZC.im, 6)}} \\Rightarrow Z = ${ctex(Z, 6)}\\ \\Omega` });
    steps.push({ text: "التيار الكلي:", tex: `\\mathbf{I} = \\frac{\\mathbf{V}}{Z} = ${ntex(cabs(I), 6)}\\angle ${ntex(deg(I), 5)}^\\circ\\ A` });
    steps.push("الجهد نفسه على كل فرع، وتيار كل فرع = الجهد ÷ ممانعته (انظر الجدول).");
    rows = [["R", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IR, 5) }], ["L", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IL, 5) }], ["C", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IC, 5) }]];
    check = cabs(csub(cadd(cadd(IR, IL), IC), I));
    steps.push(`تحقق KCL بالطور: $\\mathbf{I}_R + \\mathbf{I}_L + \\mathbf{I}_C - \\mathbf{I} = ${ntex(check, 2)}\\ A$.`);
    diagram = scaleList([["V", V], ["I", I], ["IR", IR], ["IL", IL], ["IC", IC]]);
  }
  const th = deg(Z);
  const S = cmul(V, { re: I.re, im: -I.im });
  const pf = Math.cos((th * Math.PI) / 180);
  const nature = Math.abs(th) < 1e-9 ? "مقاومية (رنين)" : th > 0 ? "حثية (التيار متأخر)" : "سعوية (التيار متقدم)";
  steps.push({ text: `زاوية الممانعة ${fmt(th, 5)}°، فالدائرة ${nature}. القدرات:`, tex: `S = VI^* = ${ctex(S, 6)}\\ VA,\\quad PF = \\cos(${ntex(th, 5)}^\\circ) = ${ntex(pf, 5)}` });
  return {
    results: [
      { label: "الممانعة الكلية", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "|Z|", value: eng(cabs(Z), "Ω", 5), text: `|Z| = ${fmt(cabs(Z), 6)} Ω` },
      { label: "التيار الكلي (فعال)", value: `${eng(cabs(I), "A", 5)} ∠ ${fmt(deg(I), 5)}°` },
      { label: "طبيعة الدائرة", value: nature },
      { label: "معامل القدرة", value: pf, sig: 5 },
      { label: "القدرة الفعالة P", value: eng(S.re, "W", 5) },
      { label: "القدرة غير الفعالة Q", value: eng(S.im, "VAR", 5) },
      { label: "القدرة الظاهرية S", value: eng(cabs(S), "VA", 5) }
    ],
    blocks: [{ type: "table", caption: "الجهود والتيارات بالطور", head: ["العنصر", "الجهد", "التيار"], rows }, phasorBlock(diagram, "مخطط الطور (مُطبّع)")],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω, |Z| = ${fmt(cabs(Z), 6)} Ω, I = ${cpolarText(I, 5)} A, PF = ${fmt(pf, 5)}`
  };
}
