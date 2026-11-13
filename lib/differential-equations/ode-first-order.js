import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const PRESETS = {
  none: { yU: "", tU: "", aU: "", note: "" },
  newton: {
    yU: "°C", tU: "min", aU: "1/min",
    note: "تبريد نيوتن: T' = −k(T − Tₐ) ⇒ a = k و b = k·Tₐ. الوحدات: T بالدرجة °C، والزمن بالدقيقة، و k بالـ 1/min، والحالة المستقرة هي درجة حرارة الوسط Tₐ."
  },
  rc: {
    yU: "V", tU: "s", aU: "1/s",
    note: "شحن مكثف RC: V' + V/(RC) = V_s/(RC) ⇒ a = 1/(RC) و b = V_s/(RC). الوحدات: الجهد بالفولت، والزمن بالثانية، والحالة المستقرة هي جهد التغذية V_s."
  },
  growth: {
    yU: "وحدة الكمية", tU: "وحدة الزمن", aU: "1/وحدة الزمن",
    note: "نمو أو اضمحلال أسي: y' = r·y ⇒ a = −r و b = 0. إذا كان r > 0 فالنمو (a < 0)، وإذا كان الاضمحلال فإن a > 0. الحالة المستقرة هي 0."
  },
  mixing: {
    yU: "g/L", tU: "min", aU: "1/min",
    note: "خزان خلط بسيط: C' + (q/V)·C = q·C_in/V ⇒ a = q/V و b = q·C_in/V. الوحدات: التركيز بالـ g/L، والزمن بالدقيقة، والتدفق q بالـ L/min، والحجم V باللتر، والحالة المستقرة هي C_in."
  }
};

const unitOf = (u) => (u ? ` ${u}` : "");
const tex = (x) => ntex(x, 6);
const texSigned = (x) => (x < 0 ? `- ${tex(-x)}` : `+ ${tex(x)}`);
const plainSigned = (x) => (x < 0 ? `− ${fmt(-x, 4)}` : `+ ${fmt(x, 4)}`);
const tTex = (t0) => (t0 === 0 ? "t" : `(t ${texSigned(-t0)})`);
const tPlain = (t0) => (t0 === 0 ? "t" : `(t ${plainSigned(-t0)})`);
const samples = (t0, span, f) => {
  const points = [];
  for (let i = 0; i <= 200; i++) {
    const t = t0 + (span * i) / 200;
    points.push([t, f(t)]);
  }
  return points;
};

export const meta = {
  description: "حل المعادلة التفاضلية الخطية من الرتبة الأولى y' + a·y = b بمعاملات ثابتة وشرط ابتدائي، مع عامل التكامل والثابت الزمني وزمن نصف الفرق والرسم البياني.",
  keywords: ["معادلة تفاضلية", "رتبة أولى", "عامل التكامل", "ثابت الزمن", "تبريد نيوتن", "شحن المكثف", "نمو أسي", "اضمحلال", "first order ODE", "integrating factor", "time constant"],
  formulas: [
    { label: "الصيغة القياسية", tex: "y' + a\\,y = b" },
    { label: "الحل العام مع الشرط الابتدائي", tex: "y(t) = \\frac{b}{a} + \\left(y_0 - \\frac{b}{a}\\right)e^{-a(t-t_0)}" },
    { label: "الثابت الزمني", tex: "\\tau = \\frac{1}{a}" },
    { label: "حالة a = 0", tex: "y(t) = y_0 + b\\,(t - t_0)" }
  ],
  inputs: [
    { id: "a", label: "المعامل a", type: "number", default: "0.1", help: "معامل y في الصيغة y' + a·y = b. يمكن أن يكون صفراً أو سالباً." },
    { id: "b", label: "الطرف الأيمن b", type: "number", default: "2", help: "الحد الثابت في الطرف الأيمن من المعادلة." },
    { id: "t0", label: "الزمن الابتدائي t0", type: "number", default: "0" },
    { id: "y0", label: "القيمة الابتدائية y0", type: "number", default: "0", help: "قيمة y عند الزمن t0." },
    { id: "t1", label: "زمن الحساب t1 (اختياري)", type: "number", default: "10", help: "اترك الحقل فارغاً إن لم تحتج قيمة عند زمن محدد." },
    {
      id: "preset", label: "نموذج تطبيقي", type: "select", default: "none",
      options: [["none", "بدون نموذج"], ["newton", "تبريد نيوتن"], ["rc", "شحن مكثف RC"], ["growth", "نمو أو اضمحلال أسي"], ["mixing", "خزان خلط بسيط"]]
    }
  ],
  example: {
    values: { a: "0.1", b: "2", t0: "0", y0: "0", t1: "10", preset: "none" },
    expect: ["y(10) = 12.64", "الحالة المستقرة = 20"],
    note: "مثال: a = 0.1، b = 2، y0 = 0، فيكون y(10) = 20(1 − e⁻¹) ≈ 12.64."
  },
  invalid: { values: { a: "0.1", b: "2", t0: "0", y0: "", t1: "10", preset: "none" } },
  related: ["ode-second-order", "ode-numerical", "rc-rl-transient", "population-growth"]
};

export function solve(input) {
  const a = num(input, "a", "المعامل a");
  const b = num(input, "b", "الطرف الأيمن b");
  const t0 = num(input, "t0", "الزمن الابتدائي t0");
  const y0 = num(input, "y0", "القيمة الابتدائية y0");
  const t1 = num(input, "t1", "الزمن t1", { optional: true });
  const preset = choice(input, "preset", "النموذج", Object.keys(PRESETS), "none");
  const P = PRESETS[preset];
  const tU = unitOf(P.tU);
  const yU = unitOf(P.yU);

  const blocks = [];
  if (P.note) {
    blocks.push({ type: "note", text: P.note });
    blocks.push({ type: "table", caption: "وحدات النموذج", head: ["المتغير", "الوحدة"], rows: [["y", P.yU], ["t", P.tU], ["a", P.aU]] });
  }

  if (a === 0) {
    const lin = (t) => y0 + b * (t - t0);
    const steps = [
      { text: "عندما a = 0 تصبح المعادلة y' = b، ولا حاجة إلى عامل التكامل:", tex: `\\frac{dy}{dt} = ${tex(b)}` },
      { text: "نكامل من t0 إلى t مباشرة:", tex: "y(t) = y_0 + \\int_{t_0}^{t} b\\,ds = y_0 + b(t - t_0)" },
      { text: "نعوض بالقيم:", tex: `y(t) = ${tex(y0)} ${texSigned(b)}\\,${tTex(t0)}` }
    ];
    const results = [
      { label: "الحل", value: `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}` },
      { label: "معدل التغير dy/dt", value: `${fmt(b, 4)}${yU}${tU ? "/" + P.tU : ""}` },
      { label: "الحالة المستقرة", value: "لا توجد (الحل خطي ويتزايد بلا حد)" },
      { label: "الثابت الزمني τ", value: "غير معرّف (a = 0)" }
    ];
    let copy = `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}`;
    if (t1 !== null) {
      const y1 = lin(t1);
      results.push({ label: `قيمة y عند t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
      copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
    }
    blocks.push({ type: "plot", title: "منحنى الحل y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 10, lin), line: true }] });
    return { results, steps, blocks, copy };
  }

  const tau = 1 / a;
  const ss = b / a;
  const C0 = y0 - ss;
  const yAt = (t) => ss + C0 * Math.exp(-a * (t - t0));
  const halfOrDouble = Math.LN2 / Math.abs(a);

  const steps = [
    { text: "المعادلة القياسية للحل:", tex: `y' ${texSigned(a)}\\,y = ${tex(b)}` },
    { text: "عامل التكامل μ(t) = e^{∫a dt} = e^{at}، نضربه في طرفي المعادلة:", tex: `\\left(y\\,e^{${tex(a)}\\,t}\\right)' = ${tex(b)}\\,e^{${tex(a)}\\,t}` },
    { text: "نكامل الطرفين:", tex: `y\\,e^{at} = \\frac{b}{a}\\,e^{at} + C` },
    { text: "نقسم على e^{at} فنحصل على الحل العام:", tex: "y = \\frac{b}{a} + C\\,e^{-at}" },
    { text: "نطبق الشرط الابتدائي y(t0) = y0:", tex: `C = \\left(y_0 - \\frac{b}{a}\\right)e^{a t_0} \\quad\\Rightarrow\\quad y(t) = ${tex(ss)} ${texSigned(C0)}\\,e^{${tex(-a)}${tTex(t0)}}` },
    { text: "الثابت الزمني:", tex: `\\tau = \\frac{1}{a} = ${tex(tau)}${tU}` }
  ];
  if (a > 0) {
    steps.push({ text: "الحالة المستقرة للحل:", tex: `y_{\\infty} = \\frac{b}{a} = ${tex(ss)}${yU}` });
    steps.push({ text: "زمن نصف الفرق بين y والحالة المستقرة:", tex: `t_{1/2} = \\frac{\\ln 2}{a} = ${tex(halfOrDouble)}${tU}` });
  } else {
    steps.push({ text: "لأن a < 0 فالحل يتباعد عن الحالة المستقرة، وزمن التضاعف للفرق:", tex: `t_2 = \\frac{\\ln 2}{|a|} = ${tex(halfOrDouble)}${tU}` });
  }

  const results = [
    { label: "الحل", value: `y(t) = ${fmt(ss, 4)} ${plainSigned(C0)} e^{${fmt(-a, 4)}${tPlain(t0)}}` },
    { label: "الحالة المستقرة y∞ = b/a", value: a > 0 ? `${fmt(ss, 4)}${yU}` : "غير موجودة (a < 0)" },
    { label: "الثابت الزمني τ = 1/a", value: `${fmt(tau, 4)}${tU}` },
    { label: a > 0 ? "زمن نصف الفرق t½" : "زمن التضاعف للفرق", value: `${fmt(halfOrDouble, 4)}${tU}` }
  ];
  let copy = `الحالة المستقرة = ${a > 0 ? `${fmt(ss, 4)}${yU}` : "غير موجودة"}، τ = ${fmt(tau, 4)}${tU}`;
  if (t1 !== null) {
    const y1 = yAt(t1);
    results.push({ label: `قيمة y عند t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
    copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
  }

  const plot = { type: "plot", title: "منحنى الحل y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 5 / Math.abs(a), yAt), line: true }] };
  if (a > 0) plot.hlines = [{ y: ss }];
  blocks.push(plot);

  return { results, steps, blocks, copy };
}
