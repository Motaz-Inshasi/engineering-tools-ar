import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "احسب موضع الصورة وتكبيرها ونوعها واتجاهها وقدرة العدسة من معادلة العدسات والمرايا، أو زاوية انكسار الضوء بقانون سنل مع الزاوية الحرجة والانعكاس الكلي الداخلي.",
  keywords: ["عدسة", "مرآة", "بعد بؤري", "معادلة العدسات", "تكبير", "قدرة العدسة", "ديوبتر", "قانون سنل", "انكسار", "انعكاس كلي", "lens", "mirror", "snell"],
  formulas: [
    { label: "معادلة العدسات والمرايا", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i},\\qquad m = -\\frac{d_i}{d_o},\\qquad P = \\frac{1}{f}" },
    { label: "قانون سنل", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2,\\qquad \\theta_c = \\sin^{-1}\\frac{n_2}{n_1}" }
  ],
  inputs: [
    { id: "mode", label: "نوع المسألة", type: "select", default: "lens", options: [["lens", "العدسات والمرايا"], ["snell", "انكسار الضوء (سنل)"]] },
    { id: "ot", label: "نوع العنصر", type: "select", default: "lens", options: [["lens", "عدسة"], ["mirror", "مرآة"]], when: { mode: ["lens"] }, help: "موجب f: عدسة مجمعة أو مرآة مقعرة. سالب f: عدسة مفرقة أو مرآة محدبة." },
    { id: "f", label: "البعد البؤري f", unit: "m", type: "number", default: "0.1", when: { mode: ["lens"] }, help: "أدخل f سالباً للعدسة المفرقة أو المرآة المحدبة." },
    { id: "do", label: "بعد الجسم do", unit: "m", type: "number", default: "0.3", when: { mode: ["lens"] } },
    { id: "n1", label: "معامل الانكسار n1", type: "number", default: "1", when: { mode: ["snell"] }, help: "الهواء ≈ 1، الماء ≈ 1.33، الزجاج ≈ 1.5." },
    { id: "th1", label: "زاوية السقوط θ1", unit: "°", type: "number", default: "30", when: { mode: ["snell"] }, help: "تُقاس من العمودي على السطح." },
    { id: "n2", label: "معامل الانكسار n2", type: "number", default: "1.5", when: { mode: ["snell"] } }
  ],
  example: {
    values: { mode: "snell", ot: "lens", f: "0.1", do: "0.3", n1: "1", th1: "30", n2: "1.5" },
    expect: ["θ2 = 19.47°"],
    note: "مثال: ضوء ينتقل من الهواء إلى الزجاج بزاوية سقوط 30°."
  },
  invalid: { values: { mode: "lens", ot: "lens", f: "0", do: "0.3", n1: "1", th1: "30", n2: "1.5" } },
  related: ["waves-doppler", "harmonic-motion", "unit-converter", "formulas-constants"]
};

function lens(input) {
  const ot = choice(input, "ot", "نوع العنصر", ["lens", "mirror"], "lens");
  const f = num(input, "f", "البعد البؤري f", { nonZero: true });
  const d = num(input, "do", "بعد الجسم do", { positive: true });
  const el = ot === "lens" ? "العدسة" : "المرآة";
  const power = 1 / f;
  const steps = [{ text: "معادلة العدسات والمرايا:", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}" }];
  const results = [];
  const blocks = [];
  let copy;
  if (Math.abs(d - f) <= 1e-12 * Math.abs(f)) {
    steps.push({ text: "عندما يساوي الجسم البعد البؤري تصبح الصورة في اللانهاية:", tex: "\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o} = 0" });
    results.push({ label: `بعد الصورة عن ${el} di`, value: "في اللانهاية" });
    blocks.push({ type: "note", tone: "warn", text: "الجسم موضوع في البؤرة تماماً، فالأشعة الخارجة متوازية ولا تتقاطع، لذلك لا توجد صورة محدودة الموضع." });
    copy = `الصورة في اللانهاية (الجسم في البؤرة)`;
  } else {
    const di = f * d / (d - f);
    const m = -di / d;
    const type = di > 0 ? "حقيقية" : "افتراضية";
    const dir = m > 0 ? "معتدلة" : "مقلوبة";
    const size = Math.abs(m) > 1 ? "مكبّرة" : Math.abs(m) < 1 ? "مصغّرة" : "بالحجم نفسه";
    steps.push(
      { text: "بعد الصورة:", tex: `d_i = \\frac{f\\,d_o}{d_o - f} = \\frac{${ntex(f)} \\times ${ntex(d)}}{${ntex(d)} - ${ntex(f)}} = ${ntex(di, 6)}\\ m` },
      { text: "التكبير:", tex: `m = -\\frac{d_i}{d_o} = ${ntex(m, 6)}` }
    );
    results.push(
      { label: `بعد الصورة عن ${el} di`, value: `${fmt(di, 4)} m` },
      { label: "نوع الصورة", value: type },
      { label: "اتجاه الصورة", value: dir },
      { label: "حجم الصورة", value: size },
      { label: "التكبير m", value: fmt(m, 4) }
    );
    copy = `di = ${fmt(di, 4)} m, m = ${fmt(m, 4)} (${type}، ${dir}، ${size})`;
  }
  steps.push({ text: "قدرة العدسة بالديوبتر:", tex: `P = \\frac{1}{f} = ${ntex(power, 6)}\\ D` });
  results.push({ label: "القدرة P = 1/f", value: `${fmt(power, 4)} D` });
  return { results, steps, blocks, copy: `${copy}, P = ${fmt(power, 4)} D` };
}

function snell(input) {
  const n1 = num(input, "n1", "معامل الانكسار n1", { positive: true });
  const th1 = num(input, "th1", "زاوية السقوط θ1", { nonNegative: true, below: 90 });
  const n2 = num(input, "n2", "معامل الانكسار n2", { positive: true });
  const s = n1 * Math.sin(th1 * DEG) / n2;
  const steps = [{ text: "قانون سنل:", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" }];
  const results = [];
  const blocks = [];
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;
  results.push({ label: "الزاوية الحرجة θc", value: crit === null ? "لا توجد (n1 ≤ n2)" : `${fmt(crit, 4)}°` });
  let copy;
  if (s > 1) {
    steps.push({ text: "sin θ2 أكبر من 1، أي لا يوجد زاوية انكسار:", tex: `\\sin\\theta_2 = \\frac{${ntex(n1)}\\sin ${ntex(th1)}^\\circ}{${ntex(n2)}} = ${ntex(s, 6)} > 1` });
    results.push({ label: "زاوية الانكسار θ2", value: "لا يوجد (انعكاس كلي داخلي)" });
    blocks.push({ type: "note", tone: "warn", text: "انعكاس كلي داخلي: الضوء لا يخرج إلى الوسط الثاني، بل ينعكس كله داخل الوسط الأكثف." });
    copy = `انعكاس كلي داخلي عند θ1 = ${fmt(th1, 4)}°`;
  } else {
    const th2 = Math.asin(s) / DEG;
    steps.push({ text: "زاوية الانكسار:", tex: `\\sin\\theta_2 = ${ntex(s, 6)},\\quad \\theta_2 = ${ntex(th2, 6)}^\\circ` });
    results.push({ label: "زاوية الانكسار θ2", value: `${fmt(th2, 4)}°` });
    copy = `θ2 = ${fmt(th2, 4)}°`;
  }
  if (crit !== null) {
    steps.push({ text: "الزاوية الحرجة (لأن n1 > n2):", tex: `\\theta_c = \\sin^{-1}\\frac{${ntex(n2)}}{${ntex(n1)}} = ${ntex(crit, 6)}^\\circ` });
    copy += `, θc = ${fmt(crit, 4)}°`;
  }
  return { results, steps, blocks, copy };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع المسألة", ["lens", "snell"], "lens");
  return mode === "snell" ? snell(input) : lens(input);
}
