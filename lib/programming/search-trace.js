import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "الخطي Linear", complexity: "O(n)", head: ["الخطوة", "الفهرس", "القيمة", "يساوي المطلوب؟"], description: "نفحص العناصر واحداً تلو الآخر من البداية، ونتوقف عند أول عنصر يساوي القيمة المطلوبة أو عند نهاية القائمة. لا يشترط ترتيب القائمة." },
  binary: { label: "الثنائي Binary", complexity: "O(log n)", head: ["الخطوة", "الفهرس الأدنى (low)", "الفهرس الأعلى (high)", "الفهرس الأوسط (mid)", "القيمة عند mid", "المقارنة", "الإجراء"], description: "تقارن القيمة المطلوبة بالعنصر الأوسط في النطاق الحالي، ثم تحذف النصف الذي لا يمكن أن تكون فيه القيمة، وتكرر ذلك حتى تجدها أو يفرغ النطاق. يشترط أن تكون القائمة مرتبة تصاعدياً." }
};

function fmtNum(x) {
  return fmt(x, 10);
}

function maxBinary(n) {
  let m = 0;
  for (let x = n; x > 0; x = Math.floor(x / 2)) m++;
  return m;
}

function linearTrace(data, target) {
  const rows = [];
  let found = -1;
  for (let i = 0; i < data.length; i++) {
    const eq = data[i] === target;
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "نعم" : "لا"]);
    if (eq) {
      found = i;
      break;
    }
  }
  return { rows, found, comparisons: rows.length };
}

function binaryTrace(data, target) {
  const rows = [];
  let lo = 0, hi = data.length - 1, found = -1, step = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = data[mid];
    step++;
    const sym = target === v ? "=" : target < v ? "<" : ">";
    const action = sym === "=" ? `وجدنا القيمة عند الفهرس ${mid}` : sym === "<" ? "القيمة المطلوبة أصغر، نبحث في النصف الأيسر" : "القيمة المطلوبة أكبر، نبحث في النصف الأيمن";
    rows.push([String(step), String(lo), String(hi), String(mid), fmtNum(v), `${fmtNum(target)} ${sym} ${fmtNum(v)}`, action]);
    if (sym === "=") {
      found = mid;
      break;
    }
    if (sym === "<") hi = mid - 1;
    else lo = mid + 1;
  }
  return { rows, found, comparisons: rows.length };
}

export const meta = {
  description: "تتبّع البحث الخطي والبحث الثنائي خطوة بخطوة على قائمة أعداد، وتعرض موضع القيمة إن وُجدت وعدد المقارنات وأقصى عدد مقارنات ممكن لحجم القائمة.",
  keywords: ["بحث", "بحث خطي", "بحث ثنائي", "linear search", "binary search", "خوارزمية البحث", "الفهرس", "لوغاريتمي"],
  formulas: [
    { label: "أقصى عدد مقارنات في البحث الثنائي", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "أقصى عدد مقارنات في البحث الخطي", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "القائمة", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "أعداد مفصولة بفواصل أو مسافات. البحث الثنائي يحتاج قائمة مرتبة، وإن لم تكن مرتبة فستُرتّب أولاً." },
    { id: "target", label: "العدد المطلوب", type: "number", default: "7" },
    { id: "algo", label: "نوع البحث", type: "select", default: "binary", options: [["linear", "الخطي Linear"], ["binary", "الثنائي Binary"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["عند الفهرس 3", "بعد 1 مقارنة"], note: "مثال: البحث الثنائي عن 7 في قائمة مرتبة من سبعة أعداد." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("المدخل أطول من 200000 حرف.", "list");
  const list = numList(input, "list", "القائمة");
  const target = num(input, "target", "العدد المطلوب");
  const algo = choice(input, "algo", "نوع البحث", Object.keys(ALGOS), "binary");
  const info = ALGOS[algo];

  const isSorted = list.every((v, i) => i === 0 || list[i - 1] <= v);
  const reorder = algo === "binary" && !isSorted;
  const data = reorder ? [...list].sort((x, y) => x - y) : list;

  const trace = algo === "binary" ? binaryTrace(data, target) : linearTrace(data, target);
  const found = trace.found >= 0;
  const n = data.length;
  const maxC = algo === "binary" ? maxBinary(n) : n;
  const targetText = fmtNum(target);

  const results = [
    { label: "النتيجة", value: found ? "موجودة" : "غير موجودة" },
    { label: "الفهرس (0-based)", value: found ? String(trace.found) : "—" },
    { label: "الموضع (1-based)", value: found ? String(trace.found + 1) : "—" },
    { label: "عدد المقارنات", value: String(trace.comparisons) },
    { label: "التعقيد الزمني", value: info.complexity },
    { label: `أقصى عدد مقارنات لحجم n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "القائمة المرتبة المستخدمة", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `القيمة ${targetText} موجودة عند الفهرس ${trace.found} (الموضع ${trace.found + 1}) بعد ${trace.comparisons} مقارنة`
    : `القيمة ${targetText} غير موجودة بعد ${trace.comparisons} مقارنة`;

  const steps = [
    `الخوارزمية: ${info.label}. ${info.description}`,
    `عدد المقارنات: ${trace.comparisons}.`,
    `التعقيد الزمني: ${info.complexity}، وأقصى عدد مقارنات لهذا الحجم هو ${maxC}.`,
    found ? `وُجدت القيمة ${targetText} عند الفهرس ${trace.found} أي في الموضع ${trace.found + 1}.` : `لم تُوجد القيمة ${targetText} في القائمة.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "البحث الثنائي يتطلب قائمة مرتبة تصاعدياً، لذلك رُتّبت القائمة أولاً، والفهارس في النتيجة والجدول تشير إلى القائمة المرتبة." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "تتبّع خطوات البحث", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `عُرضت أول ${MAX_ROWS} خطوة من أصل ${trace.rows.length} خطوة.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "القيمة مكررة في القائمة، والبحث الخطي يعيد أول موضع لها." : "القيمة مكررة في القائمة، والبحث الثنائي يعيد أحد مواضعها، وليس بالضرورة الأول." });

  return { results, steps, blocks, copy };
}
