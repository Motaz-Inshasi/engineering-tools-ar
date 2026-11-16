import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseNetlist, solveMNA, nodesOf } from "../core/circuit.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { NETLIST_HELP } from "./nodal-analysis.js";

export const meta = {
  description: "محاسبه معادل تونن و نورتن بین هر دو نقطه در مدار جریان مستقیم: ولتاژ مدار باز، مقاومت معادل با خاموش کردن منابع، و جریان اتصال کوتاه، همراه با بررسی با بار اختیاری.",
  keywords: ["تونن", "نورتن", "thevenin", "norton", "معادل", "ولتاژ مدار باز", "جریان اتصال کوتاه"],
  formulas: [
    { label: "تعریف‌ها", tex: "V_{th} = V_{oc},\\quad R_{th} = \\left.\\frac{V_{ab}}{I_{test}}\\right|_{\\text{sources off}},\\quad I_N = \\frac{V_{th}}{R_{th}}" },
    { label: "جریان بار از معادل", tex: "I_L = \\frac{V_{th}}{R_{th} + R_L}" }
  ],
  inputs: [
    { id: "net", label: "عناصر مدار", type: "textarea", rows: 5, default: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", help: NETLIST_HELP },
    { id: "a", label: "پایانه a", type: "text", default: "3" },
    { id: "b", label: "پایانه b", type: "text", default: "0" },
    { id: "RL", label: "مقاومت بار برای بررسی (اختیاری)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { net: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", a: "3", b: "0", RL: "4" }, expect: ["Vth = 8 V", "Rth = 4 Ω"], note: "مثال نوشتاری: منبع 24 V با یک مقسم 6 Ω و 3 Ω و یک مقاومت 2 Ω به پایانه." },
  invalid: { values: { net: "V1 1 0 24\nR1 1 2 6", a: "5", b: "0" } },
  related: ["max-power-transfer", "nodal-analysis", "mesh-analysis", "wheatstone-bridge"]
};

const norm = (n) => (["0", "gnd", "GND", "g"].includes(n) ? "0" : n);

export function thevenin(els, a, b) {
  const open = solveMNA(els, "net");
  const Voc = open.V[a] - open.V[b];
  const off = els.filter((e) => e.kind !== "I").map((e) => (e.kind === "V" ? { ...e, value: 0 } : e));
  const test = solveMNA([...off, { name: "ITEST", kind: "I", a: b, b: a, value: 1 }], "net");
  const Rth = test.V[a] - test.V[b];
  return { Voc, Rth, open };
}

export function solve(input) {
  const els = parseNetlist(str(input, "net", "عناصر مدار"), "net");
  const a = norm(str(input, "a", "پایانه a").trim()), b = norm(str(input, "b", "پایانه b").trim());
  const nodes = ["0", ...nodesOf(els)];
  if (!nodes.includes(a)) fail(`گره «${a}» در مدار وجود ندارد.`, "a");
  if (!nodes.includes(b)) fail(`گره «${b}» در مدار وجود ندارد.`, "b");
  if (a === b) fail("دو پایانه باید دو گره متفاوت باشند.", "b");
  const RL = num(input, "RL", "مقاومت بار", { optional: true, positive: true });
  let r;
  try { r = thevenin(els, a, b); } catch (e) {
    if (e.name === "InputError") fail(`${e.message} (هنگام خاموش کردن منابع یا تزریق جریان آزمون ممکن است مدار قطع شود).`, "net");
    throw e;
  }
  const { Voc, Rth } = r;
  const steps = [
    { text: "گام 1: مدار را همان‌طور که هست (پایانه‌ها باز) با تحلیل گره حل می‌کنیم و ولتاژ بین آن‌ها را می‌خوانیم:", tex: `V_{th} = V_{${a}} - V_{${b}} = ${ntex(Voc, 6)}\\ V` },
    { text: "گام 2: منابع مستقل را خاموش می‌کنیم (منبع ولتاژ اتصال کوتاه و منبع جریان مدار باز می‌شود)، جریان آزمون 1 A بین دو پایانه تزریق می‌کنیم و ولتاژ را اندازه می‌گیریم:", tex: `R_{th} = \\frac{V_{test}}{1\\,A} = ${ntex(Rth, 6)}\\ \\Omega` }
  ];
  const results = [{ label: "ولتاژ تونن Vth", value: eng(Voc, "V", 5), text: `Vth = ${eng(Voc, "V", 5)}` }, { label: "مقاومت تونن Rth", value: eng(Rth, "Ω", 5), text: `Rth = ${eng(Rth, "Ω", 5)}` }];
  if (Math.abs(Rth) > 1e-12) {
    const In = Voc / Rth;
    results.push({ label: "جریان نورتن IN", value: eng(In, "A", 5) }, { label: "مقاومت نورتن RN", value: eng(Rth, "Ω", 5) });
    steps.push({ text: "گام 3: معادل نورتن از تبدیل منابع:", tex: `I_N = \\frac{V_{th}}{R_{th}} = ${ntex(In, 6)}\\ A,\\quad R_N = R_{th}` });
  } else steps.push("مقاومت تونن صفر است، پس معادل یک منبع ولتاژ ایده‌آل است و معادل نورتن وجود ندارد.");
  if (RL !== null) {
    const IL = Voc / (Rth + RL);
    const full = solveMNA([...els, { name: "RLOAD", kind: "R", a, b, value: RL }], "net");
    const ILfull = (full.V[a] - full.V[b]) / RL;
    results.push({ label: `جریان بار ${eng(RL, "Ω")}`, value: eng(IL, "A", 5) }, { label: "ولتاژ بار", value: eng(IL * RL, "V", 5) });
    steps.push({ text: "بررسی: بار را ابتدا به معادل و سپس مستقیم به مدار اصلی وصل می‌کنیم:", tex: `I_L = \\frac{${ntex(Voc, 6)}}{${ntex(Rth, 6)} + ${ntex(RL)}} = ${ntex(IL, 6)}\\ A\\quad\\text{vs}\\quad ${ntex(ILfull, 6)}\\ A` });
    steps.push(Math.abs(IL - ILfull) <= 1e-9 * Math.max(1, Math.abs(IL)) ? "دو نتیجه یکسان‌اند، پس معادل درست است." : `اختلاف غیرمنتظره ${fmt(IL - ILfull, 3)}.`);
  }
  return { results, steps, copy: `Vth = ${eng(Voc, "V", 5)}, Rth = ${eng(Rth, "Ω", 5)}` };
}
