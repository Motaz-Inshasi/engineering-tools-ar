import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Özel malzeme (E değerini elle girin)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "Kuvvet, kesit, uzunluk ve malzemeden gerilme σ, birim uzama ε, uzama ΔL ve emniyet katsayısını hesaplayın; ya da uzama ölçümünden elastisite modülünü bulun. Akma ve kopma uyarıları da gösterilir.",
  keywords: ["Gerilme", "Birim uzama", "Young modülü", "Uzama", "Emniyet katsayısı", "stress", "strain", "Young's modulus", "Hooke"],
  formulas: [
    { label: "Gerilme", tex: "\\sigma = \\frac{F}{A}" },
    { label: "Birim uzama ve elastisite modülü", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "Emniyet katsayısı", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama modu", type: "select", default: "axial", options: [["axial", "Kuvvet, kesit ve malzemeden"], ["measurement", "Uzama ölçümünden (E hesabı için)"]] },
    { id: "F", label: "Kuvvet F", unit: "N", type: "number", default: "10k", help: "Kilonewton için k önekini kullanabilirsiniz, örneğin 10k." },
    { id: "section", label: "Kesit şekli", type: "select", default: "circle", options: [["circle", "Dairesel (çap d)"], ["rect", "Dikdörtgen (b × h)"], ["custom", "Özel kesit alanı A"]] },
    { id: "d", label: "Çap d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "Genişlik b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "Yükseklik h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "Kesit alanı A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "İlk boy L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "Ölçülen uzama ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "Malzeme", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "Elastisite modülü E (özel malzeme için)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "Akma dayanımı (isteğe bağlı)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "En büyük çekme dayanımı (isteğe bağlı)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "Emniyet katsayısı = 1,96"],
    note: "Örnek: çapı 10 mm, boyu 1000 mm olan ve 10 kN yük taşıyan A36 çelik çubuk."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "Çap d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "Dairesel kesit alanı:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "Genişlik b", { positive: true });
    const h = num(input, "h", "Yükseklik h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "Dikdörtgen kesit alanı:" };
  }
  const A = num(input, "Acust", "Kesit alanı A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "Girilen kesit alanı:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama modu", ["axial", "measurement"], "axial");
  const F = num(input, "F", "Kuvvet F", { positive: true });
  const section = choice(input, "section", "Kesit şekli", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "İlk boy L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "Uzama ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "Hesaplanan gerilme:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "Ölçülen uzamadan birim uzama:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "Ölçülen elastisite modülü:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "Alan A", value: `${fmt(A, 4)} mm²` },
        { label: "Gerilme σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "Birim uzama ε", value: sci(eps) },
        { label: "Ölçülen elastisite modülü E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "Malzeme", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "Elastisite modülü E", { positive: true });
    yieldV = num(input, "Ycust", "Akma dayanımı", { positive: true, optional: true });
    utsV = num(input, "Ucust", "En büyük çekme dayanımı", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "Özel malzeme" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "Uygulanamaz" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `Uyarı: gerilme (${fmt(sigma, 4)} MPa) akma dayanımını (${fmt(yieldV, 4)} MPa) aştı; kalıcı (plastik) deformasyon oluşur.` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `Uyarı: gerilme (${fmt(sigma, 4)} MPa) en büyük çekme dayanımını (${fmt(utsV, 4)} MPa) aştı; kopma oluşur.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "Eksenel gerilme:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `Hooke yasasıyla birim uzama (E ${matName} için = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "Toplam uzama:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "Akma dayanımına göre emniyet katsayısı:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "Alan A", value: `${fmt(A, 4)} mm²` },
    { label: "Gerilme σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "Birim uzama ε", value: sci(eps) },
    { label: "Uzama ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "Kullanılan elastisite modülü E", value: `${fmt(E, 4)} GPa` },
    { label: "Emniyet katsayısı", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa, ε = ${sci(eps)}, ΔL = ${fmt(dL, 4)} mm, emniyet katsayısı = ${sfText}`
  };
}
