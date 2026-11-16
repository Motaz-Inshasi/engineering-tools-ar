import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Özel malzeme (E değerini elle girin)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "Ortasında tekil P yükü olan basit mesnetli kiriş",
    load: "P",
    deflTex: "\\delta_{max} = \\frac{PL^3}{48EI}",
    momTex: "M_{max} = \\frac{PL}{4}",
    shearTex: "V_{max} = \\frac{P}{2}",
    defl: (q, L, EI) => (q * L ** 3) / (48 * EI),
    moment: (q, L) => (q * L) / 4,
    shear: (q) => q / 2,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^3}{48 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}}{4}`,
    substShear: (q) => `\\frac{${ntex(q)}}{2}`,
    reactions: (q) => [["A mesnedindeki tepki", q / 2], ["B mesnedindeki tepki", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "Düzgün yayılı w yükü olan basit mesnetli kiriş",
    load: "w",
    deflTex: "\\delta_{max} = \\frac{5wL^4}{384EI}",
    momTex: "M_{max} = \\frac{wL^2}{8}",
    shearTex: "V_{max} = \\frac{wL}{2}",
    defl: (q, L, EI) => (5 * q * L ** 4) / (384 * EI),
    moment: (q, L) => (q * L * L) / 8,
    shear: (q, L) => (q * L) / 2,
    substDefl: (q, L, EI) => `\\frac{5 \\times ${ntex(q)} \\times ${ntex(L)}^4}{384 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}^2}{8}`,
    substShear: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}}{2}`,
    reactions: (q, L) => [["A mesnedindeki tepki", (q * L) / 2], ["B mesnedindeki tepki", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "Serbest ucunda tekil P yükü olan konsol kiriş (bir ucu ankastre)",
    load: "P",
    deflTex: "\\delta_{max} = \\frac{PL^3}{3EI}",
    momTex: "M_{max} = PL",
    shearTex: "V_{max} = P",
    defl: (q, L, EI) => (q * L ** 3) / (3 * EI),
    moment: (q, L) => q * L,
    shear: (q) => q,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^3}{3 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `${ntex(q)} \\times ${ntex(L)}`,
    substShear: (q) => `${ntex(q)}`,
    reactions: (q) => [["Sabit mesnetteki düşey tepki", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "Düzgün yayılı w yükü olan konsol kiriş (bir ucu ankastre)",
    load: "w",
    deflTex: "\\delta_{max} = \\frac{wL^4}{8EI}",
    momTex: "M_{max} = \\frac{wL^2}{2}",
    shearTex: "V_{max} = wL",
    defl: (q, L, EI) => (q * L ** 4) / (8 * EI),
    moment: (q, L) => (q * L * L) / 2,
    shear: (q, L) => q * L,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^4}{8 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}^2}{2}`,
    substShear: (q, L) => `${ntex(q)} \\times ${ntex(L)}`,
    reactions: (q, L) => [["Sabit mesnetteki düşey tepki", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "Tekil veya düzgün yayılı yük altındaki basit kiriş ya da konsolun en büyük sehimini, eğilme momentini, kesme kuvvetini, mesnet tepkilerini ve eğilme gerilmesini hesaplayın; sehim eğrisini çizin ve L/360 sınırını kontrol edin.",
  keywords: ["Kiriş eğriliği", "Kiriş sehimi", "Eğilme momenti", "Kesme kuvveti", "Basit kiriş", "Konsol kiriş", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "Tekil yük altında basit kirişin sehimi", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "Düzgün yayılı yük altında basit kirişin sehimi", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "Uçtaki tekil yük altında konsolun sehimi", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "Düzgün yayılı yük altında konsolun sehimi", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "Eğilme gerilmesi", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "Kiriş ve yük türü", type: "select", default: "ss_point", options: [["ss_point", "Basit mesnetli - ortada tekil yük"], ["ss_uniform", "Basit mesnetli - düzgün yayılı yük"], ["cant_point", "Konsol - serbest uçta tekil yük"], ["cant_uniform", "Konsol - düzgün yayılı yük"]] },
    { id: "L", label: "Kiriş boyu L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "Tekil yük P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "Düzgün yayılı yük w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "Malzeme (elastisite modülü E için)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "Elastisite modülü E (özel malzeme için)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "Kesit", type: "select", default: "rect", options: [["rect", "Dikdörtgen b × h"], ["circle", "Çap d ile daire"], ["custom", "Atalet momenti I elle girilir"]] },
    { id: "b", label: "Genişlik b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "Yükseklik h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "Çap d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "Atalet momenti I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "I birimi", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "Tarafsız eksenden en uzak liflere olan uzaklık c", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "Örnek: boyu 4 m olan basit kiriş, ortasında 10 kN yük, E = 200 GPa ve I = 8,0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "Kiriş türü", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "Kiriş boyu L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "Tekil yük P", { positive: true })
    : num(input, "w", "Düzgün yayılı yük w", { positive: true });

  const mat = choice(input, "mat", "Malzeme", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "Elastisite modülü E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "Kesit", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "Genişlik b", { positive: true });
    const h = num(input, "h", "Yükseklik h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "Çap d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "Atalet momenti I", { positive: true });
    const unit = choice(input, "Iunit", "I birimi", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "Uzaklık c", { positive: true });
  }

  const EPa = Egpa * 1e9;
  const Im4 = I * 1e-12;
  const EI = EPa * Im4;
  const defm = c.defl(q, L, EI);
  const dMm = defm * 1000;
  const M = c.moment(q, L);
  const V = c.shear(q, L);
  const sigma = ((M * 1000) * cDist) / I;
  const allow = (L * 1000) / 360;
  const ratio = (L * 1000) / dMm;
  const okDefl = dMm <= allow;

  const yieldV = !isCustom && find(mat).yield !== null ? find(mat).yield : null;
  const SF = yieldV ? yieldV / sigma : null;

  const N = 120;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (L * i) / N;
    points.push([x, -c.curve(q, L, EI, x) * 1000]);
  }

  const reactions = c.reactions(q, L);
  const steps = [
    { text: `Durum: ${c.name}`, tex: c.deflTex },
    { text: "E'yi Pa'ya, I'yı m⁴'e çeviriyoruz:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "En büyük sehim:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "En büyük eğilme momenti:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "En büyük kesme kuvveti:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "En büyük eğilme gerilmesi (c = en uzak liften uzaklık):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "İzin verilen L/360 sınırının kontrolü:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "En büyük sehim δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "En büyük eğilme momenti M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "En büyük kesme kuvveti V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "Duvardaki ankastre moment", value: eng(M, "N·m", 4) });
  results.push(
    { label: "En büyük eğilme gerilmesi σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "Uzunluk / sehim oranı L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "İzin verilen L/360 sınırı", value: `${fmt(allow, 4)} mm` },
    { label: "Sehim kontrolü", value: okDefl ? "Kabul edilebilir (δ ≤ L/360)" : "İzin verilen L/360 sınırını aşıyor" }
  );
  if (SF !== null) results.push({ label: "Akma dayanımına göre emniyet katsayısı", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "Sehim eğrisi (negatif yön aşağıdadır)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "Elastik eğri", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `Uyarı: sehim (${fmt(dMm, 4)} mm) izin verilen L/360 sınırını (${fmt(allow, 4)} mm) aşıyor.` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "Uyarı: eğilme gerilmesi, seçilen malzemenin akma dayanımını aştı." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
