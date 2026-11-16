import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { ctex, cfmt, cpolarText, cpolarTex, cmul, cdiv, csub, cabs } from "../core/complex.js";
import { C, zR, zL, zC, zsum, zpar, deg, phasorBlock, scaleList, cadd } from "./common.js";

export const meta = {
  description: "Sinüzoidal kaynaklı seri veya paralel RLC devresini çözümleyin: toplam empedans, akım, her elemanın fazlı gerilim ve akımı, güç faktörü ve üç güç türü; faz diyagramı ve Kirchhoff doğrulamasıyla.",
  keywords: ["RLC devresi", "RLC", "Seri", "Paralel", "toplam empedans", "Faz diyagramı", "phasor diagram", "Güç faktörü"],
  formulas: [
    { label: "Seri ve paralel", tex: "Z_s = R + j\\left(\\omega L - \\frac{1}{\\omega C}\\right),\\qquad \\frac{1}{Z_p} = \\frac{1}{R} + \\frac{1}{j\\omega L} + j\\omega C" },
    { label: "Akım ve güç", tex: "\\mathbf{I} = \\frac{\\mathbf{V}}{Z},\\qquad S = \\mathbf{V}\\mathbf{I}^* = P + jQ,\\qquad PF = \\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Bağlantı", type: "select", default: "series", options: [["series", "Seri"], ["parallel", "Paralel"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "30" },
    { id: "L", label: "L", unit: "H", type: "number", default: "100m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u" },
    { id: "f", label: "Frekans f", unit: "Hz", type: "number", default: "50" },
    { id: "V", label: "Kaynak gerilimi (etkin değer)", unit: "V", type: "number", default: "230" }
  ],
  example: { values: { conn: "series", R: "30", L: "100m", C: "100u", f: "50", V: "230" }, expect: ["|Z| = 30.0"], note: "Örnek: 50 Hz'de rezonansa yakın seri devre." },
  invalid: { values: { conn: "series", R: "30", L: "100m", C: "0", f: "50", V: "230" } },
  related: ["resonance", "impedance", "complex-power", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Bağlantı", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const f = num(input, "f", "Frekans", { positive: true }), Vm = num(input, "V", "Gerilim", { positive: true });
  const w = 2 * Math.PI * f;
  const ZR = zR(R), ZL = zL(L, w), ZC = zC(Cap, w);
  const V = C(Vm, 0);
  const steps = [{ text: "Her elemanın empedansı:", tex: `Z_R = ${ntex(R)},\\quad Z_L = j${ntex(ZL.im, 6)},\\quad Z_C = -j${ntex(-ZC.im, 6)}\\ \\Omega` }];
  let Z, I, rows, check, diagram;
  if (conn === "series") {
    Z = zsum(ZR, ZL, ZC);
    I = cdiv(V, Z);
    const VR = cmul(I, ZR), VL = cmul(I, ZL), VC = cmul(I, ZC);
    steps.push({ text: "Seri bağlantıda empedansları toplarız:", tex: `Z = ${ntex(R)} + j(${ntex(ZL.im, 6)} - ${ntex(-ZC.im, 6)}) = ${ctex(Z, 6)}\\ \\Omega` });
    steps.push({ text: "Akım (kaynak gerilimini 0° referans alarak):", tex: `\\mathbf{I} = \\frac{${ntex(Vm)}\\angle 0^\\circ}{${ctex(Z, 6)}} = ${ntex(cabs(I), 6)}\\angle ${ntex(deg(I), 5)}^\\circ\\ A` });
    steps.push("Her elemanın gerilimi = akım × empedansı (tabloya bakın). Rezonans yakınında bobin ve kondansatör gerilimi kaynak gerilimini aşabilir.");
    rows = [["R", { tex: cpolarTex(VR, 5) }, { tex: cpolarTex(I, 5) }], ["L", { tex: cpolarTex(VL, 5) }, { tex: cpolarTex(I, 5) }], ["C", { tex: cpolarTex(VC, 5) }, { tex: cpolarTex(I, 5) }]];
    check = cabs(csub(cadd(cadd(VR, VL), VC), V));
    steps.push(`Fazlı KVL kontrolü: $\\mathbf{V}_R + \\mathbf{V}_L + \\mathbf{V}_C - \\mathbf{V} = ${ntex(check, 2)}\\ V$.`);
    diagram = scaleList([["V", V], ["I", I], ["VR", VR], ["VL", VL], ["VC", VC]]);
  } else {
    Z = zpar(ZR, ZL, ZC);
    I = cdiv(V, Z);
    const IR = cdiv(V, ZR), IL = cdiv(V, ZL), IC = cdiv(V, ZC);
    steps.push({ text: "Paralel bağlantıda admitansları toplarız:", tex: `Y = \\frac{1}{${ntex(R)}} - \\frac{j}{${ntex(ZL.im, 6)}} + \\frac{j}{${ntex(-ZC.im, 6)}} \\Rightarrow Z = ${ctex(Z, 6)}\\ \\Omega` });
    steps.push({ text: "Toplam akım:", tex: `\\mathbf{I} = \\frac{\\mathbf{V}}{Z} = ${ntex(cabs(I), 6)}\\angle ${ntex(deg(I), 5)}^\\circ\\ A` });
    steps.push("Her kolda gerilim aynıdır; her kolun akımı = gerilim ÷ empedans (tabloya bakın).");
    rows = [["R", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IR, 5) }], ["L", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IL, 5) }], ["C", { tex: cpolarTex(V, 5) }, { tex: cpolarTex(IC, 5) }]];
    check = cabs(csub(cadd(cadd(IR, IL), IC), I));
    steps.push(`Fazlı KCL kontrolü: $\\mathbf{I}_R + \\mathbf{I}_L + \\mathbf{I}_C - \\mathbf{I} = ${ntex(check, 2)}\\ A$.`);
    diagram = scaleList([["V", V], ["I", I], ["IR", IR], ["IL", IL], ["IC", IC]]);
  }
  const th = deg(Z);
  const S = cmul(V, { re: I.re, im: -I.im });
  const pf = Math.cos((th * Math.PI) / 180);
  const nature = Math.abs(th) < 1e-9 ? "dirençli (rezonans)" : th > 0 ? "endüktif (akım geride)" : "kapasitif (akım önde)";
  steps.push({ text: `Empedans açısı ${fmt(th, 5)}°, devre ${nature}. Güçler:`, tex: `S = VI^* = ${ctex(S, 6)}\\ VA,\\quad PF = \\cos(${ntex(th, 5)}^\\circ) = ${ntex(pf, 5)}` });
  return {
    results: [
      { label: "Toplam empedans", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "|Z|", value: eng(cabs(Z), "Ω", 5), text: `|Z| = ${fmt(cabs(Z), 6)} Ω` },
      { label: "Toplam akım (etkin)", value: `${eng(cabs(I), "A", 5)} ∠ ${fmt(deg(I), 5)}°` },
      { label: "Devrenin türü", value: nature },
      { label: "Güç faktörü", value: pf, sig: 5 },
      { label: "Aktif güç P", value: eng(S.re, "W", 5) },
      { label: "Reaktif güç Q", value: eng(S.im, "VAR", 5) },
      { label: "Görünür güç S", value: eng(cabs(S), "VA", 5) }
    ],
    blocks: [{ type: "table", caption: "Fazlı gerilimler ve akımlar", head: ["Eleman", "Gerilim", "Akım"], rows }, phasorBlock(diagram, "Faz diyagramı (normalleştirilmiş)")],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω, |Z| = ${fmt(cabs(Z), 6)} Ω, I = ${cpolarText(I, 5)} A, PF = ${fmt(pf, 5)}`
  };
}
