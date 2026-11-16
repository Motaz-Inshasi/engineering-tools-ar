import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Seri veya paralel bağlı kondansatörlerin eşdeğer kapasitesini ya da bobinlerin eşdeğer endüktansını hesaplayın; gerilim girildiğinde kondansatörlerdeki gerilim, yük ve enerji dağılımını gösterin.",
  keywords: ["Seri kondansatörler", "Paralel kondansatörler", "Eşdeğer kapasite", "Bobinler", "Eşdeğer endüktans", "capacitors", "inductors", "Kondansatör enerjisi"],
  formulas: [
    { label: "Kondansatörler (dirençlerin tersi)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "Karşılıklı endüktansı olmayan bobinler (dirençler gibi)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "Tür", type: "select", default: "C", options: [["C", "Kondansatörler"], ["L", "Bobinler"]] },
    { id: "mode", label: "Bağlantı", type: "select", default: "series", options: [["series", "Seri"], ["parallel", "Paralel"]] },
    { id: "list", label: "Değerler (F veya H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "Örneğin 10u, 22u veya 4.7n." },
    { id: "V", label: "Toplam gerilim (isteğe bağlı, kondansatörler için)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "Örnek: 12 V üzerinde üç kondansatör seri bağlı." },
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
  const kind = choice(input, "kind", "Tür", ["C", "L"], "C");
  const mode = choice(input, "mode", "Bağlantı", ["series", "parallel"], "series");
  const list = numList(input, "list", "Değerler", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "Seri kondansatörler" : "Paralel bobinler"}: terslerini topluyoruz.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "Paralel kondansatörler" : "Seri bobinler"}: değerleri doğrudan topluyoruz.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "Eşdeğer kapasite" : "Eşdeğer endüktans", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "Gerilim", { optional: true });
    if (V !== null) {
      if (V === 0) fail("Gerilim sıfır; gerekmiyorsa boş bırakın.", "V");
      const Q = eq * V;
      results.push({ label: "Toplam yük", value: eng(Q, "C", 4) }, { label: "Depolanan enerji", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "Seri bağlıda yük aynıdır; gerilim daha küçük kondansatörde daha büyüktür." : "Paralel bağlıda gerilim aynıdır; yük kapasiteyle orantılıdır.", head: ["Kondansatör", "Kapasite", "Gerilim", "Yük", "Enerji"], rows });
      steps.push({ text: "Toplam yük ve enerji:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("Bobinler arasında karşılıklı endüktans olmadığını varsayıyoruz (yani birbirinden uzaktırlar veya ekranlıdırlar).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
