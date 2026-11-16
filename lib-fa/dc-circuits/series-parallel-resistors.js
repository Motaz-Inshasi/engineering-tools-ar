import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه مقاومت معادل یک گروه مقاومت به‌صورت سری یا موازی، همراه با توزیع ولتاژ یا جریان و توان روی هر مقاومت، وقتی ولتاژ منبع وارد شود.",
  keywords: ["مقاومت‌های سری", "مقاومت‌های موازی", "مقاومت معادل", "series", "parallel", "resistors", "نحوه اتصال مقاومت‌ها"],
  formulas: [
    { label: "سری", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n" },
    { label: "موازی", tex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots,\\qquad R_1 \\parallel R_2 = \\frac{R_1 R_2}{R_1 + R_2}" }
  ],
  inputs: [
    { id: "list", label: "مقادیر مقاومت‌ها", unit: "Ω", type: "text", default: "100, 220, 330", wide: true, help: "با ویرگول یا فاصله جدا کنید؛ می‌توانید از k و M استفاده کنید، مانند 4.7k." },
    { id: "mode", label: "روش اتصال", type: "select", default: "series", options: [["series", "سری"], ["parallel", "موازی"]] },
    { id: "V", label: "ولتاژ منبع (اختیاری)", unit: "V", type: "number" }
  ],
  example: { values: { list: "100, 220, 330", mode: "parallel", V: "12" }, expect: ["Req = 56.9 Ω"], note: "مثال: سه مقاومت 100 و 220 و 330 Ω به‌صورت موازی." },
  invalid: { values: { list: "100, -5", mode: "series" } },
  related: ["voltage-current-divider", "ohms-law", "capacitor-inductor-combination", "standard-resistor-values"]
};

export function equivalent(list, mode) {
  return mode === "series" ? list.reduce((a, b) => a + b, 0) : 1 / list.reduce((a, b) => a + 1 / b, 0);
}

export function solve(input) {
  const list = numList(input, "list", "مقادیر مقاومت‌ها", { positive: true, max: 50 });
  const mode = choice(input, "mode", "روش اتصال", ["series", "parallel"], "series");
  const V = num(input, "V", "ولتاژ منبع", { optional: true });
  const Req = equivalent(list, mode);
  const steps = [];
  if (mode === "series") {
    steps.push({ text: "در حالت سری مقاومت‌ها را مستقیماً جمع می‌کنیم:", tex: `R_{eq} = ${list.map((r) => ntex(r)).join(" + ")} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("معادل سری همیشه از بزرگ‌ترین مقاومت بزرگ‌تر است.");
  } else {
    steps.push({ text: "در حالت موازی عکس مقاومت‌ها (هدایت‌ها) را جمع می‌کنیم:", tex: `\\frac{1}{R_{eq}} = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(1 / Req, 6)}\\ S` });
    steps.push({ tex: `R_{eq} = ${ntex(Req, 6)}\\ \\Omega` });
    if (list.length === 2) steps.push({ text: "برای فقط دو مقاومت می‌توان از فرمول «حاصل‌ضرب بر مجموع» استفاده کرد:", tex: `\\frac{${ntex(list[0])} \\times ${ntex(list[1])}}{${ntex(list[0])} + ${ntex(list[1])}} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("معادل موازی همیشه از کوچک‌ترین مقاومت کوچک‌تر است.");
  }
  const results = [{ label: "مقاومت معادل", value: eng(Req, "Ω", 4), text: `Req = ${eng(Req, "Ω", 4)}` }, { label: "هدایت معادل", value: eng(1 / Req, "S", 4) }];
  const blocks = [];
  if (V !== null) {
    if (V === 0) fail("ولتاژ منبع صفر است؛ اگر لازم نیست آن را خالی بگذارید.", "V");
    const I = V / Req;
    results.push({ label: "جریان کل", value: eng(I, "A", 4) }, { label: "توان کل", value: eng(V * I, "W", 4) });
    const rows = list.map((r, k) => {
      const vr = mode === "series" ? I * r : V, ir = mode === "series" ? I : V / r;
      return [`R${k + 1}`, eng(r, "Ω"), eng(vr, "V"), eng(ir, "A"), eng(vr * ir, "W")];
    });
    blocks.push({ type: "table", caption: mode === "series" ? "جریان یکسان از هر مقاومت می‌گذرد و ولتاژ تقسیم می‌شود" : "ولتاژ یکسان روی هر مقاومت است و جریان تقسیم می‌شود", head: ["مقاومت", "مقدار", "ولتاژ", "جریان", "توان"], rows });
    steps.push({ text: "جریان کل از قانون اهم:", tex: `I = \\frac{V}{R_{eq}} = \\frac{${ntex(V)}}{${ntex(Req, 6)}} = ${ntex(I, 6)}\\ A` });
    steps.push(mode === "series" ? "در حالت سری: ولتاژ هر مقاومت $V_k = I R_k$ است و مجموع ولتاژها برابر ولتاژ منبع است (KVL)." : "در حالت موازی: جریان هر مقاومت $I_k = V / R_k$ است و مجموع جریان‌ها برابر جریان کل است (KCL).");
  }
  return { results, blocks, steps, copy: `Req = ${eng(Req, "Ω", 4)}` };
}
