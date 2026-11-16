import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Hitung kapasitansi ekivalen kapasitor, atau induktansi ekivalen induktor, yang dirangkai seri atau paralel, dengan distribusi tegangan, muatan, dan energi pada kapasitor saat diberi tegangan.",
  keywords: ["kapasitor seri", "kapasitor paralel", "kapasitansi ekivalen", "induktor", "induktansi ekivalen", "capacitors", "inductors", "energi kapasitor"],
  formulas: [
    { label: "Kapasitor (kebalikan resistor)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "Induktor tanpa induktansi bersama (seperti resistor)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "Jenis", type: "select", default: "C", options: [["C", "Kapasitor"], ["L", "induktor"]] },
    { id: "mode", label: "Rangkaian", type: "select", default: "series", options: [["series", "Seri"], ["parallel", "Paralel"]] },
    { id: "list", label: "Nilai (F atau H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "Seperti 10u, 22u, atau 4.7n." },
    { id: "V", label: "Tegangan total (opsional, untuk kapasitor)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "Contoh: tiga kapasitor seri pada tegangan 12 V." },
  invalid: { values: { kind: "C", mode: "series", list: "10u, 0", V: "" } },
  related: ["series-parallel-resistors", "impedance", "resonance", "timer-555"]
};

export function equivalent(kind, mode, list) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const inv = (a) => 1 / a.reduce((s, x) => s + 1 / x, 0);
  if (kind === "C") return mode === "parallel" ? sum(list) : inv(list);
  return mode === "series" ? sum(list) : inv(list);
}

export function solve(input) {
  const kind = choice(input, "kind", "Jenis", ["C", "L"], "C");
  const mode = choice(input, "mode", "Rangkaian", ["series", "parallel"], "series");
  const list = numList(input, "list", "Nilai", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "Kapasitor seri" : "Induktor paralel"}: kita jumlahkan kebalikannya.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "Kapasitor paralel" : "Induktor seri"}: kita jumlahkan nilainya secara langsung.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "Kapasitansi ekivalen" : "Induktansi ekivalen", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "Tegangan", { optional: true });
    if (V !== null) {
      if (V === 0) fail("Tegangan nol; kosongkan jika tidak diperlukan.", "V");
      const Q = eq * V;
      results.push({ label: "Muatan total", value: eng(Q, "C", 4) }, { label: "Energi tersimpan", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "Seri: muatannya sama, dan tegangan lebih besar pada kapasitor yang lebih kecil" : "Paralel: tegangannya sama, dan muatan sebanding dengan kapasitansi", head: ["Kapasitor", "Kapasitansi", "Tegangan", "Muatan", "Energi"], rows });
      steps.push({ text: "Muatan total dan energi:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("Kita asumsikan tidak ada induktansi bersama antara induktor (yaitu berjauhan atau terlindungi).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
