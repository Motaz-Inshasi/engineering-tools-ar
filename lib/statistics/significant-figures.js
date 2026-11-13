import { fail, str, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "عدّ الأرقام المعنوية في أي قياس مع شرح القاعدة لكل صفر، وقرّب إلى عدد محدد من الأرقام المعنوية، واحسب انتشار الخطأ (عدم اليقين) في الجمع والطرح والضرب والقسمة والقوى.",
  keywords: ["الأرقام المعنوية", "significant figures", "sig figs", "التقريب", "الصيغة العلمية", "انتشار الخطأ", "عدم اليقين", "uncertainty propagation", "الخطأ النسبي", "دقة القياس"],
  formulas: [
    { label: "الجمع والطرح", tex: "q = a \\pm b \\Rightarrow \\delta q = \\sqrt{\\delta a^2 + \\delta b^2}" },
    { label: "الضرب والقسمة والقوى", tex: "\\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{\\delta a}{a}\\right)^2 + \\left(\\frac{\\delta b}{b}\\right)^2},\\qquad q = a^n \\Rightarrow \\frac{\\delta q}{|q|} = |n|\\frac{\\delta a}{|a|}" }
  ],
  inputs: [
    { id: "mode", label: "العملية", type: "select", default: "count", options: [["count", "عدّ الأرقام المعنوية"], ["round", "التقريب إلى أرقام معنوية"], ["prop", "انتشار الخطأ"]] },
    { id: "value", label: "العدد", type: "text", default: "0.004050", when: { mode: ["count", "round"] }, help: "اكتبه كما سُجّل في القياس، مثل 0.004050 أو 1200 أو 1.20e3." },
    { id: "sf", label: "عدد الأرقام المعنوية المطلوب", type: "number", default: "2", when: { mode: ["round"] } },
    { id: "op", label: "العملية الحسابية", type: "select", default: "mul", options: [["add", "a + b"], ["sub", "a − b"], ["mul", "a × b"], ["div", "a ÷ b"], ["pow", "aⁿ"]], when: { mode: ["prop"] } },
    { id: "a", label: "القيمة a", type: "number", default: "4.52", when: { mode: ["prop"] } },
    { id: "da", label: "عدم اليقين δa", type: "number", default: "0.02", when: { mode: ["prop"] } },
    { id: "b", label: "القيمة b", type: "number", default: "2.0", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "db", label: "عدم اليقين δb", type: "number", default: "0.2", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "power", label: "الأس n", type: "number", default: "2", when: { mode: ["prop"], op: ["pow"] } }
  ],
  example: { values: { mode: "count", value: "0.004050" }, expect: ["4 أرقام معنوية"], note: "مثال: كم رقماً معنوياً في 0.004050؟" },
  invalid: { values: { mode: "count", value: "12a" } },
  related: ["descriptive-stats", "engineering-notation", "unit-converter"]
};

function analyze(raw) {
  const s0 = normalizeDigits(raw).replace(/\s+/g, "").replace(/^\+/, "");
  const m = s0.match(/^(-?)(\d*)(\.?)(\d*)(?:[eE]([+-]?\d+))?$/);
  if (!m || (!m[2] && !m[4])) return null;
  const [, sign, ip, dot, fp, ex] = m;
  const digits = ip + fp;
  const first = digits.search(/[1-9]/);
  if (first < 0) return { zero: true, sign, ip, dot, fp, ex };
  let last = digits.length - 1;
  let ambiguous = false;
  if (!dot && !fp) {
    const t = ip.match(/0*$/)[0].length;
    if (t > 0) { ambiguous = true; last = ip.length - 1 - t; }
  }
  const sig = digits.slice(first, last + 1);
  return { sign, ip, dot, fp, ex, digits, first, last, count: sig.length, ambiguous, value: Number(s0) };
}

function roundSig(x, n) {
  if (x === 0) return "0";
  const r = Number(x.toPrecision(n));
  const e2 = Math.floor(Math.log10(Math.abs(r)));
  if (e2 >= n || e2 < -4) { const [mm, ee] = r.toExponential(n - 1).split("e"); return `${mm} × 10^${Number(ee)}`; }
  const dec = Math.max(0, n - 1 - e2);
  return r.toFixed(dec);
}

const sfWord = (n) => (n === 1 ? "رقم معنوي واحد" : n === 2 ? "رقمان معنويان" : n <= 10 ? `${n} أرقام معنوية` : `${n} رقماً معنوياً`);

function sci(x, n) {
  const [mm, ee] = x.toExponential(n - 1).split("e");
  return `${mm} × 10^${Number(ee)}`;
}

export function solve(input) {
  const mode = choice(input, "mode", "العملية", ["count", "round", "prop"], "count");
  if (mode === "prop") return propagate(input);
  const raw = str(input, "value", "العدد");
  const A = analyze(raw);
  if (!A) fail("اكتب عدداً صحيحاً مثل 0.00450 أو 1200 أو 3.20e5.", "value");
  if (A.zero) fail("العدد صفر ليس له أرقام معنوية محددة.", "value");
  if (mode === "round") {
    const n = num(input, "sf", "عدد الأرقام المعنوية", { integer: true, min: 1, max: 15 });
    const out = roundSig(A.value, n);
    return {
      results: [{ label: `مقرّباً إلى ${sfWord(n)}`, value: out, text: `${raw} ≈ ${out}` }, { label: "بالصيغة العلمية", value: sci(A.value, n) }],
      steps: [
        `نبدأ العد من أول رقم غير صفري (${A.digits[A.first]}) ونأخذ ${n} رقماً.`,
        `ننظر إلى الرقم التالي: إذا كان 5 أو أكثر نزيد الرقم الأخير واحداً، وإلا نتركه.`,
        `النتيجة: ${out}.`
      ],
      copy: `${raw} ≈ ${out} (${sfWord(n)})`
    };
  }
  const allDigits = A.digits;
  const rows = [...allDigits].map((d, i) => {
    let why, sig = false;
    if (i < A.first) why = "صفر بادئ: يحدد موضع الفاصلة فقط";
    else if (i > A.last) why = "صفر لاحق بلا فاصلة عشرية: غامض، يُعدّ غير معنوي";
    else if (d !== "0") { why = "رقم غير صفري: معنوي دائماً"; sig = true; }
    else if (allDigits.slice(i).search(/[1-9]/) > 0) { why = "صفر محصور بين أرقام معنوية: معنوي"; sig = true; }
    else { why = "صفر لاحق مع فاصلة عشرية: معنوي (يدل على دقة القياس)"; sig = true; }
    return [d, sig ? "✓" : "✗", why];
  });
  const n = A.count;
  const blocks = [{ type: "table", caption: "حكم كل رقم", head: ["الرقم", "معنوي؟", "السبب"], rows }];
  if (A.ambiguous) blocks.push({ type: "note", tone: "warn", text: `الأصفار في آخر عدد صحيح بلا فاصلة غامضة. اكتب ${A.ip}. (بنقطة) أو بالصيغة العلمية لتوضيح أنها معنوية.` });
  const word = sfWord(n);
  return {
    results: [
      { label: "عدد الأرقام المعنوية", value: word, text: word },
      { label: "بالصيغة العلمية", value: sci(A.value, n) },
      { label: "عدد المنازل العشرية", value: String(A.fp.length) }
    ],
    steps: [
      "القواعد: كل رقم غير صفري معنوي، والأصفار بين أرقام معنوية معنوية، والأصفار البادئة غير معنوية، والأصفار اللاحقة معنوية فقط إذا وُجدت فاصلة عشرية.",
      `في «${raw}» نطبّق القواعد على كل رقم كما في الجدول.`,
      `المجموع: ${word}.`,
      "تذكير: في الجمع والطرح نقرّب الناتج إلى أقل عدد منازل عشرية، وفي الضرب والقسمة إلى أقل عدد أرقام معنوية."
    ],
    blocks, copy: `${raw}: ${word}`
  };
}

function propagate(input) {
  const op = choice(input, "op", "العملية الحسابية", ["add", "sub", "mul", "div", "pow"], "mul");
  const a = num(input, "a", "القيمة a"), da = num(input, "da", "δa", { nonNegative: true });
  let q, dq, steps = [];
  if (op === "pow") {
    const n = num(input, "power", "الأس n");
    if (a === 0 && n <= 0) fail("لا يمكن رفع الصفر إلى أس غير موجب.", "a");
    if (a < 0 && !Number.isInteger(n)) fail("لا يمكن رفع عدد سالب إلى أس كسري.", "power");
    if (a === 0) fail("القيمة a صفر، فالخطأ النسبي غير معرّف.", "a");
    q = Math.pow(a, n); dq = Math.abs(q) * Math.abs(n) * (da / Math.abs(a));
    steps.push({ text: "الخطأ النسبي يُضرب في الأس:", tex: `q = ${ntex(a)}^{${ntex(n)}} = ${ntex(q, 6)},\\quad \\frac{\\delta q}{|q|} = |${ntex(n)}| \\times \\frac{${ntex(da)}}{${ntex(Math.abs(a))}} = ${ntex(dq / Math.abs(q), 4)}` });
  } else {
    const b = num(input, "b", "القيمة b"), db = num(input, "db", "δb", { nonNegative: true });
    if (op === "add" || op === "sub") {
      q = op === "add" ? a + b : a - b;
      dq = Math.sqrt(da * da + db * db);
      steps.push({ text: "في الجمع والطرح تُجمع الأخطاء المطلقة تربيعياً:", tex: `q = ${ntex(q, 8)},\\quad \\delta q = \\sqrt{${ntex(da)}^2 + ${ntex(db)}^2} = ${ntex(dq, 4)}` });
    } else {
      if (op === "div" && b === 0) fail("لا يمكن القسمة على صفر.", "b");
      if (a === 0 || b === 0) fail("الخطأ النسبي غير معرّف عندما تكون إحدى القيمتين صفراً.", a === 0 ? "a" : "b");
      q = op === "mul" ? a * b : a / b;
      const rel = Math.sqrt((da / a) ** 2 + (db / b) ** 2);
      dq = Math.abs(q) * rel;
      steps.push({ text: "في الضرب والقسمة تُجمع الأخطاء النسبية تربيعياً:", tex: `q = ${ntex(q, 8)},\\quad \\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{${ntex(da)}}{${ntex(a)}}\\right)^2 + \\left(\\frac{${ntex(db)}}{${ntex(b)}}\\right)^2} = ${ntex(rel, 4)}` });
    }
  }
  let shown;
  if (dq > 0) {
    const e = Math.floor(Math.log10(dq));
    const d1 = Number(dq.toPrecision(1));
    const lead = Number(String(d1).replace(/[-.0]/g, "")[0]);
    const digits = lead === 1 ? 2 : 1;
    const dqr = Number(dq.toPrecision(digits));
    const dec = Math.max(0, -(e - digits + 1));
    const qr = (Math.round(q * 10 ** dec) / 10 ** dec).toFixed(dec);
    shown = `${qr} ± ${dqr.toFixed(dec)}`;
    steps.push(`نقرّب عدم اليقين إلى ${digits === 2 ? "رقمين معنويين (لأنه يبدأ بـ 1)" : "رقم معنوي واحد"}، ثم نقرّب الناتج إلى المنزلة نفسها: ${shown}.`);
  } else {
    shown = `${fmt(q, 8)} ± 0`;
    steps.push("عدم اليقين صفر، فالناتج دقيق.");
  }
  return {
    results: [
      { label: "الناتج مع عدم اليقين", value: shown, text: `q = ${shown}` },
      { label: "الناتج الخام", value: fmt(q, 8) },
      { label: "عدم اليقين المطلق δq", value: fmt(dq, 4) },
      { label: "عدم اليقين النسبي", value: q !== 0 ? `${fmt((100 * dq) / Math.abs(q), 3)}%` : "غير معرّف" }
    ],
    steps, copy: `q = ${shown}`
  };
}
