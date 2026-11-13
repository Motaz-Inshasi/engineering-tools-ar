import { fail, choice, numList, matrixInput, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { normCdf, normInv, tCdf, tInv, chi2Cdf, chi2Inv, mean, variance, pText } from "./dist.js";

export const meta = {
  description: "نفّذ اختبارات الفرضيات الشائعة: z و t لعينة واحدة ولعينتين وللأزواج، واختبار النسب، واختبار مربع كاي لجودة المطابقة والاستقلال، مع إحصاءة الاختبار وقيمة p والقيمة الحرجة والقرار وفترة الثقة.",
  keywords: ["اختبار الفرضيات", "اختبار t", "اختبار z", "قيمة p", "p-value", "مربع كاي", "chi-square", "الفرضية الصفرية", "مستوى الدلالة", "t-test", "عينتين", "الأزواج", "نسبة"],
  formulas: [
    { label: "إحصاءة t لعينة واحدة", tex: "t = \\frac{\\bar x - \\mu_0}{s/\\sqrt n},\\quad df = n - 1" },
    { label: "اختبار ولش لعينتين", tex: "t = \\frac{\\bar x_1 - \\bar x_2}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}}" },
    { label: "مربع كاي", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "test", label: "نوع الاختبار", type: "select", default: "t1", options: [["z1", "z لعينة واحدة (σ معلوم)"], ["t1", "t لعينة واحدة"], ["t2", "t لعينتين مستقلتين"], ["paired", "t للأزواج (قبل وبعد)"], ["prop1", "نسبة واحدة"], ["prop2", "مقارنة نسبتين"], ["gof", "مربع كاي: جودة المطابقة"], ["indep", "مربع كاي: الاستقلال"]] },
    { id: "xbar", label: "الوسط x̄", type: "number", default: "52.3", when: { test: ["z1", "t1", "t2"] } },
    { id: "sd", label: "الانحراف المعياري للعينة s", type: "number", default: "6.1", when: { test: ["t1", "t2"] } },
    { id: "sigma", label: "الانحراف المعياري للمجتمع σ", type: "number", default: "6", when: { test: ["z1"] } },
    { id: "n", label: "حجم العينة n", type: "number", default: "25", when: { test: ["z1", "t1", "t2", "prop1", "prop2"] } },
    { id: "xbar2", label: "وسط العينة الثانية", type: "number", default: "48.9", when: { test: ["t2"] } },
    { id: "sd2", label: "الانحراف المعياري للعينة الثانية", type: "number", default: "7.4", when: { test: ["t2"] } },
    { id: "n2", label: "حجم العينة الثانية", type: "number", default: "30", when: { test: ["t2", "prop2"] } },
    { id: "pooled", label: "افترض تساوي التباينين (t المجمّع)", type: "checkbox", default: "", when: { test: ["t2"] } },
    { id: "mu0", label: "القيمة المفترضة μ₀ (أو الفرق)", type: "number", default: "50", when: { test: ["z1", "t1", "t2", "paired"] } },
    { id: "d1", label: "القياسات الأولى (قبل)", type: "textarea", default: "72 68 75 80 66 71 77 69", when: { test: ["paired"] } },
    { id: "d2", label: "القياسات الثانية (بعد)", type: "textarea", default: "75 70 74 85 70 75 80 70", when: { test: ["paired"] } },
    { id: "x", label: "عدد النجاحات x", type: "number", default: "58", when: { test: ["prop1", "prop2"] } },
    { id: "x2", label: "عدد النجاحات في العينة الثانية", type: "number", default: "45", when: { test: ["prop2"] } },
    { id: "p0", label: "النسبة المفترضة p₀", type: "number", default: "0.5", when: { test: ["prop1"] } },
    { id: "obs", label: "التكرارات المشاهدة", type: "textarea", default: "18 22 20 25 15", when: { test: ["gof"] } },
    { id: "exp", label: "التكرارات أو النسب المتوقعة (اختياري)", type: "textarea", default: "", when: { test: ["gof"] }, help: "اتركها فارغة لافتراض التساوي. يمكن إدخال نسب مثل 0.25 0.5 0.25 أو تكرارات." },
    { id: "table", label: "جدول التوافق (صف لكل سطر)", type: "textarea", default: "20 30\n25 25\n15 35", when: { test: ["indep"] } },
    { id: "alt", label: "الفرضية البديلة", type: "select", default: "two", options: [["two", "≠ (طرفين)"], ["greater", "> (طرف أيمن)"], ["less", "< (طرف أيسر)"]], when: { test: ["z1", "t1", "t2", "paired", "prop1", "prop2"] } },
    { id: "alpha", label: "مستوى الدلالة α", type: "number", default: "0.05" }
  ],
  example: { values: { test: "t1", xbar: "52.3", sd: "6.1", n: "25", mu0: "50", alt: "two", alpha: "0.05" }, expect: ["t = 1.885", "p = 0.07156", "لا نرفض H₀"], note: "مثال: عينة من 25 طالباً متوسط درجاتهم 52.3 وانحرافهم 6.1، فهل يختلف المتوسط عن 50؟" },
  invalid: { values: { test: "t1", xbar: "52", sd: "6", n: "1", mu0: "50", alt: "two", alpha: "0.05" } },
  related: ["descriptive-stats", "probability-distributions", "linear-regression"]
};

const ALT = { two: "\\neq", greater: ">", less: "<" };

function pval(stat, cdf, alt) {
  if (alt === "greater") return 1 - cdf(stat);
  if (alt === "less") return cdf(stat);
  return 2 * Math.min(cdf(stat), 1 - cdf(stat));
}

function crit(inv, alpha, alt) {
  if (alt === "greater") return `${fmt(inv(1 - alpha), 5)}`;
  if (alt === "less") return `${fmt(inv(alpha), 5)}`;
  return `±${fmt(inv(1 - alpha / 2), 5)}`;
}

export function solve(input) {
  const test = choice(input, "test", "نوع الاختبار", ["z1", "t1", "t2", "paired", "prop1", "prop2", "gof", "indep"], "t1");
  const alt = choice(input, "alt", "الفرضية البديلة", ["two", "greater", "less"], "two");
  const alpha = num(input, "alpha", "مستوى الدلالة", { min: 1e-6, max: 0.5 });
  const steps = [], results = [], blocks = [];
  let stat, p, symbol, critText, ci = null, h0, h1, df = null;
  const zDist = { cdf: normCdf, inv: normInv };
  const tDist = (k) => ({ cdf: (x) => tCdf(x, k), inv: (q) => tInv(q, k) });
  const confText = `${fmt(100 * (1 - alpha))}%`;
  if (test === "z1" || test === "t1") {
    const xb = num(input, "xbar", "الوسط");
    const n = num(input, "n", "حجم العينة", { integer: true, min: 2 });
    const s = test === "z1" ? num(input, "sigma", "σ", { positive: true }) : num(input, "sd", "الانحراف المعياري", { positive: true });
    const mu0 = num(input, "mu0", "القيمة المفترضة");
    const se = s / Math.sqrt(n);
    stat = (xb - mu0) / se;
    symbol = test === "z1" ? "z" : "t";
    const D = test === "z1" ? zDist : tDist(n - 1);
    if (test === "t1") df = n - 1;
    p = pval(stat, D.cdf, alt);
    critText = crit(D.inv, alpha, alt);
    const q = test === "z1" ? normInv(1 - alpha / 2) : tInv(1 - alpha / 2, n - 1);
    ci = [xb - q * se, xb + q * se];
    h0 = `\\mu = ${ntex(mu0)}`; h1 = `\\mu ${ALT[alt]} ${ntex(mu0)}`;
    steps.push({ text: "الخطأ المعياري وإحصاءة الاختبار:", tex: `SE = \\frac{${ntex(s)}}{\\sqrt{${n}}} = ${ntex(se, 5)},\\quad ${symbol} = \\frac{${ntex(xb)} - ${ntex(mu0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "t2") {
    const x1 = num(input, "xbar", "الوسط الأول"), s1 = num(input, "sd", "الانحراف الأول", { positive: true }), n1 = num(input, "n", "حجم العينة الأولى", { integer: true, min: 2 });
    const x2 = num(input, "xbar2", "الوسط الثاني"), s2 = num(input, "sd2", "الانحراف الثاني", { positive: true }), n2 = num(input, "n2", "حجم العينة الثانية", { integer: true, min: 2 });
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "الفرق المفترض");
    const pooled = !isBlank(input.pooled) && input.pooled !== "0";
    let se;
    if (pooled) {
      const sp2 = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
      se = Math.sqrt(sp2 * (1 / n1 + 1 / n2)); df = n1 + n2 - 2;
      steps.push({ text: "التباين المجمّع:", tex: `s_p^2 = \\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2} = ${ntex(sp2, 5)},\\quad SE = ${ntex(se, 5)},\\ df = ${df}` });
    } else {
      const a = (s1 * s1) / n1, b = (s2 * s2) / n2;
      se = Math.sqrt(a + b); df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
      steps.push({ text: "اختبار ولش (لا يفترض تساوي التباينين):", tex: `SE = \\sqrt{\\frac{${ntex(s1)}^2}{${n1}} + \\frac{${ntex(s2)}^2}{${n2}}} = ${ntex(se, 5)},\\quad df \\approx ${ntex(df, 5)}` });
    }
    stat = (x1 - x2 - d0) / se; symbol = "t";
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [x1 - x2 - q * se, x1 - x2 + q * se];
    h0 = `\\mu_1 - \\mu_2 = ${ntex(d0)}`; h1 = `\\mu_1 - \\mu_2 ${ALT[alt]} ${ntex(d0)}`;
    steps.push({ text: "إحصاءة الاختبار:", tex: `t = \\frac{(${ntex(x1)} - ${ntex(x2)}) - ${ntex(d0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "paired") {
    const a = numList(input, "d1", "القياسات الأولى", { min: 2 }), b = numList(input, "d2", "القياسات الثانية", { min: 2 });
    if (a.length !== b.length) fail(`عدد القياسات يجب أن يتساوى في القائمتين (${a.length} مقابل ${b.length}).`, "d2");
    const d = b.map((v, i) => v - a[i]), n = d.length;
    const md = mean(d), sd = Math.sqrt(variance(d));
    if (sd === 0) fail("كل الفروق متساوية، فالانحراف المعياري للفروق صفر ولا يمكن إجراء الاختبار.", "d2");
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "الفرق المفترض");
    const se = sd / Math.sqrt(n);
    stat = (md - d0) / se; symbol = "t"; df = n - 1;
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [md - q * se, md + q * se];
    h0 = `\\mu_d = ${ntex(d0)}`; h1 = `\\mu_d ${ALT[alt]} ${ntex(d0)}`;
    steps.push(`نحسب الفروق d = بعد − قبل: ${d.slice(0, 30).map((v) => fmt(v)).join("، ")}.`);
    steps.push({ text: "وسط الفروق وانحرافها وإحصاءة الاختبار:", tex: `\\bar d = ${ntex(md, 5)},\\ s_d = ${ntex(sd, 5)},\\quad t = \\frac{${ntex(md, 5)} - ${ntex(d0)}}{${ntex(sd, 5)}/\\sqrt{${n}}} = ${ntex(stat, 5)}` });
  } else if (test === "prop1") {
    const n = num(input, "n", "حجم العينة", { integer: true, min: 1 }), x = num(input, "x", "عدد النجاحات", { integer: true, nonNegative: true });
    if (x > n) fail("عدد النجاحات لا يمكن أن يزيد عن حجم العينة.", "x");
    const p0 = num(input, "p0", "النسبة المفترضة", { min: 0, max: 1 });
    if (p0 <= 0 || p0 >= 1) fail("النسبة المفترضة يجب أن تكون بين 0 و 1 دون الطرفين.", "p0");
    const ph = x / n, se = Math.sqrt((p0 * (1 - p0)) / n);
    stat = (ph - p0) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const sep = Math.sqrt((ph * (1 - ph)) / n);
    ci = [ph - normInv(1 - alpha / 2) * sep, ph + normInv(1 - alpha / 2) * sep];
    h0 = `p = ${ntex(p0)}`; h1 = `p ${ALT[alt]} ${ntex(p0)}`;
    steps.push({ text: "النسبة في العينة وإحصاءة z:", tex: `\\hat p = \\frac{${x}}{${n}} = ${ntex(ph, 5)},\\quad z = \\frac{${ntex(ph, 5)} - ${ntex(p0)}}{\\sqrt{${ntex(p0)}(1-${ntex(p0)})/${n}}} = ${ntex(stat, 5)}` });
    if (n * p0 < 10 || n * (1 - p0) < 10) blocks.push({ type: "note", tone: "warn", text: "شرط التقريب الطبيعي (np₀ ≥ 10 و n(1−p₀) ≥ 10) غير متحقق، فالنتيجة تقريبية." });
  } else if (test === "prop2") {
    const n1 = num(input, "n", "حجم العينة الأولى", { integer: true, min: 1 }), x1 = num(input, "x", "النجاحات الأولى", { integer: true, nonNegative: true });
    const n2 = num(input, "n2", "حجم العينة الثانية", { integer: true, min: 1 }), x2 = num(input, "x2", "النجاحات الثانية", { integer: true, nonNegative: true });
    if (x1 > n1) fail("عدد النجاحات لا يمكن أن يزيد عن حجم العينة.", "x");
    if (x2 > n2) fail("عدد النجاحات لا يمكن أن يزيد عن حجم العينة.", "x2");
    const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
    if (pp === 0 || pp === 1) fail("النسبة المجمّعة 0 أو 1، فلا يمكن إجراء الاختبار.", "x");
    const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    stat = (p1 - p2) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const seu = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    ci = [p1 - p2 - normInv(1 - alpha / 2) * seu, p1 - p2 + normInv(1 - alpha / 2) * seu];
    h0 = "p_1 = p_2"; h1 = `p_1 ${ALT[alt]} p_2`;
    steps.push({ text: "النسبتان والنسبة المجمّعة وإحصاءة z:", tex: `\\hat p_1 = ${ntex(p1, 5)},\\ \\hat p_2 = ${ntex(p2, 5)},\\ \\hat p = ${ntex(pp, 5)},\\quad z = \\frac{${ntex(p1 - p2, 5)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "gof") {
    const O = numList(input, "obs", "التكرارات المشاهدة", { min: 2 });
    if (O.some((v) => v < 0)) fail("التكرارات لا يمكن أن تكون سالبة.", "obs");
    const N = O.reduce((a, b) => a + b, 0);
    if (N <= 0) fail("مجموع التكرارات يجب أن يكون أكبر من صفر.", "obs");
    let E;
    if (isBlank(input.exp)) E = O.map(() => N / O.length);
    else {
      const e = numList(input, "exp", "القيم المتوقعة", { positive: true });
      if (e.length !== O.length) fail(`عدد القيم المتوقعة (${e.length}) يجب أن يساوي عدد الفئات (${O.length}).`, "exp");
      const se = e.reduce((a, b) => a + b, 0);
      E = e.map((v) => (v / se) * N);
    }
    stat = O.reduce((a, o, i) => a + (o - E[i]) ** 2 / E[i], 0); symbol = "\\chi^2"; df = O.length - 1;
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{البيانات تتبع التوزيع المتوقع}"; h1 = "\\text{لا تتبعه}";
    steps.push({ text: "نحسب مساهمة كل فئة ونجمع:", tex: `\\chi^2 = ${O.slice(0, 8).map((o, i) => `\\frac{(${ntex(o)} - ${ntex(E[i], 4)})^2}{${ntex(E[i], 4)}}`).join(" + ")}${O.length > 8 ? " + \\cdots" : ""} = ${ntex(stat, 5)}` });
    blocks.push({ type: "table", caption: "المشاهد مقابل المتوقع", head: ["الفئة", "O", "E", "(O−E)²/E"], rows: O.map((o, i) => [String(i + 1), fmt(o), fmt(E[i], 5), fmt((o - E[i]) ** 2 / E[i], 4)]) });
    if (E.some((v) => v < 5)) blocks.push({ type: "note", tone: "warn", text: "بعض التكرارات المتوقعة أقل من 5، فتقريب مربع كاي قد يكون غير دقيق." });
  } else {
    const T = matrixInput(input, "table", "جدول التوافق");
    if (T.length < 2 || T[0].length < 2) fail("الجدول يحتاج صفين وعمودين على الأقل.", "table");
    if (T.flat().some((v) => v < 0)) fail("التكرارات لا يمكن أن تكون سالبة.", "table");
    const R = T.map((r) => r.reduce((a, b) => a + b, 0)), C = T[0].map((_, j) => T.reduce((a, r) => a + r[j], 0));
    const N = R.reduce((a, b) => a + b, 0);
    if (R.some((v) => v === 0) || C.some((v) => v === 0)) fail("يوجد صف أو عمود مجموعه صفر.", "table");
    const E = T.map((r, i) => r.map((_, j) => (R[i] * C[j]) / N));
    stat = T.reduce((a, r, i) => a + r.reduce((b, o, j) => b + (o - E[i][j]) ** 2 / E[i][j], 0), 0);
    symbol = "\\chi^2"; df = (T.length - 1) * (T[0].length - 1);
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{المتغيران مستقلان}"; h1 = "\\text{يوجد ارتباط}";
    steps.push({ text: "التكرار المتوقع لكل خلية = (مجموع صفها × مجموع عمودها) ÷ المجموع الكلي:", tex: `E_{11} = \\frac{${R[0]} \\times ${C[0]}}{${N}} = ${ntex(E[0][0], 5)},\\ \\ldots` });
    steps.push({ text: "إحصاءة الاختبار ودرجات الحرية:", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(stat, 5)},\\quad df = (${T.length}-1)(${T[0].length}-1) = ${df}` });
    blocks.push({ type: "table", caption: "المشاهد (المتوقع)", head: ["", ...C.map((_, j) => `عمود ${j + 1}`), "المجموع"], rows: [...T.map((r, i) => [`صف ${i + 1}`, ...r.map((o, j) => `${fmt(o)} (${fmt(E[i][j], 4)})`), fmt(R[i])]), ["المجموع", ...C.map((c) => fmt(c)), fmt(N)]] });
    const cv = Math.sqrt(stat / (N * (Math.min(T.length, T[0].length) - 1)));
    results.push({ label: "معامل كرامر V (قوة الارتباط)", value: fmt(cv, 4) });
  }
  p = Math.min(1, Math.max(0, p));
  const reject = p < alpha;
  const decision = reject ? "نرفض H₀" : "لا نرفض H₀";
  const st = symbol === "\\chi^2" ? "χ²" : symbol;
  steps.unshift({ text: "الفرضيتان:", tex: `H_0:\\ ${h0},\\qquad H_1:\\ ${h1}` });
  steps.push({ text: `قيمة p${df !== null ? ` (درجات الحرية ${fmt(df, 5)})` : ""} والمقارنة مع α:`, tex: `${pText(p).replace("<", "<")} ${reject ? "<" : "\\ge"} \\alpha = ${ntex(alpha)}` });
  steps.push(reject ? `بما أن قيمة p أصغر من α، نرفض الفرضية الصفرية: يوجد دليل إحصائي كافٍ عند مستوى دلالة ${fmt(alpha)}.` : `بما أن قيمة p ليست أصغر من α، لا نرفض الفرضية الصفرية: لا يوجد دليل كافٍ عند مستوى دلالة ${fmt(alpha)}.`);
  results.unshift(
    { label: "إحصاءة الاختبار", value: `${st} = ${fmt(stat, 4)}`, text: `${st} = ${fmt(stat, 4)}` },
    { label: "قيمة p", value: pText(p) },
    ...(df !== null ? [{ label: "درجات الحرية", value: fmt(df, 5) }] : []),
    { label: `القيمة الحرجة (α = ${fmt(alpha)})`, value: critText },
    { label: "القرار", value: decision }
  );
  if (ci) results.push({ label: `فترة ثقة ${confText}`, value: `[${fmt(ci[0], 5)} ، ${fmt(ci[1], 5)}]` });
  if (alt !== "two" && ci && !["gof", "indep"].includes(test)) blocks.push({ type: "note", text: `فترة الثقة المعروضة ثنائية الطرف (${confText}) للتوضيح.` });
  return { results, steps, blocks, copy: `${st} = ${fmt(stat, 4)}, ${pText(p)}, ${decision} (α = ${fmt(alpha)})` };
}
