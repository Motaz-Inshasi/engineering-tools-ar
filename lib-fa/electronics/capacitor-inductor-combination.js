import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "ظرفیت معادل خازن‌ها یا اندوکتانس معادل سلف‌ها را در حالت سری یا موازی محاسبه کنید، همراه با توزیع ولتاژ، بار و انرژی بین خازن‌ها هنگام اعمال ولتاژ.",
  keywords: ["خازن‌های سری", "خازن‌های موازی", "ظرفیت معادل", "سلف‌ها", "اندوکتانس معادل", "capacitors", "inductors", "انرژی خازن"],
  formulas: [
    { label: "خازن‌ها (عکس مقاومت‌ها)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "سلف‌ها بدون القای متقابل (مانند مقاومت‌ها)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "نوع", type: "select", default: "C", options: [["C", "خازن‌ها"], ["L", "سلف‌ها"]] },
    { id: "mode", label: "اتصال", type: "select", default: "series", options: [["series", "سری"], ["parallel", "موازی"]] },
    { id: "list", label: "مقادیر (F یا H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "مثلاً 10u، 22u یا 4.7n." },
    { id: "V", label: "ولتاژ کل (اختیاری، برای خازن‌ها)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "مثال: سه خازن سری روی 12 V." },
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
  const kind = choice(input, "kind", "نوع", ["C", "L"], "C");
  const mode = choice(input, "mode", "اتصال", ["series", "parallel"], "series");
  const list = numList(input, "list", "مقادیر", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "خازن‌های سری" : "سلف‌های موازی"}: معکوس مقادیر را جمع می‌کنیم.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "خازن‌های موازی" : "سلف‌های سری"}: مقادیر را مستقیماً جمع می‌کنیم.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "ظرفیت معادل" : "اندوکتانس معادل", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "ولتاژ", { optional: true });
    if (V !== null) {
      if (V === 0) fail("ولتاژ صفر است؛ اگر لازم نیست، خالی بگذارید.", "V");
      const Q = eq * V;
      results.push({ label: "بار کل", value: eng(Q, "C", 4) }, { label: "انرژی ذخیره‌شده", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "در حالت سری: بار یکسان است و ولتاژ بیشتر روی خازن کوچک‌تر ظاهر می‌شود" : "در حالت موازی: ولتاژ روی هر خازن یکسان است و بار با ظرفیت متناسب است", head: ["خازن", "ظرفیت", "ولتاژ", "بار", "انرژی"], rows });
      steps.push({ text: "بار کل و انرژی:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("فرض می‌کنیم هیچ القای متقابلی بین سلف‌ها وجود ندارد (یعنی دور از هم یا محافظ‌شده‌اند).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
