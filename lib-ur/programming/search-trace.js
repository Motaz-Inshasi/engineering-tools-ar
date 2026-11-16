import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "خطی Linear", complexity: "O(n)", head: ["مرحلہ", "انڈیکس", "قدر", "مطلوبہ کے برابر؟"], description: "ہم عناصر کو شروع سے ایک ایک کر کے دیکھتے ہیں، اور پہلے عنصر پر رکتے ہیں جو مطلوبہ قدر کے برابر ہو، یا فہرست کے آخر تک پہنچ جائیں۔ فہرست کا ترتیب میں ہونا ضروری نہیں۔" },
  binary: { label: "بائنری Binary", complexity: "O(log n)", head: ["مرحلہ", "نچلا انڈیکس (low)", "بالائی انڈیکس (high)", "درمیانی انڈیکس (mid)", "mid پر قدر", "موازنہ", "عمل"], description: "مطلوبہ قدر کا موازنہ موجودہ دائرے کے درمیانی عنصر سے کیا جاتا ہے، پھر وہ نصف حذف کیا جاتا ہے جس میں قدر نہیں ہو سکتی، اور یہ عمل دہراتے ہیں جب تک قدر مل نہ جائے یا دائرہ خالی ہو جائے۔ اس کے لیے فہرست کا صعودی ترتیب میں ہونا ضروری ہے۔" }
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
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "ہاں" : "نہیں"]);
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
    const action = sym === "=" ? `ہمیں انڈیکس ${mid} پر قدر مل گئی` : sym === "<" ? "مطلوبہ قدر چھوٹی ہے، ہم بائیں نصف میں تلاش کرتے ہیں" : "مطلوبہ قدر بڑی ہے، ہم دائیں نصف میں تلاش کرتے ہیں";
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
  description: "اعداد کی فہرست پر خطی اور بائنری سرچ کو قدم بہ قدم دکھاتا ہے، اور اگر قدر موجود ہو تو اس کی جگہ، موازنوں کی تعداد اور فہرست کے حجم کے لیے زیادہ سے زیادہ ممکنہ موازنے دکھاتا ہے۔",
  keywords: ["سرچ", "خطی سرچ", "بائنری سرچ", "linear search", "binary search", "سرچ الگورتھم", "انڈیکس", "لوگارتھمک"],
  formulas: [
    { label: "بائنری سرچ میں زیادہ سے زیادہ موازنے", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "خطی سرچ میں زیادہ سے زیادہ موازنے", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "فہرست", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "کوما یا خالی جگہ سے الگ کیے گئے اعداد۔ بائنری سرچ کے لیے مرتب فہرست درکار ہے، اور اگر وہ مرتب نہ ہو تو پہلے ترتیب دی جائے گی۔" },
    { id: "target", label: "مطلوبہ عدد", type: "number", default: "7" },
    { id: "algo", label: "سرچ کی قسم", type: "select", default: "binary", options: [["linear", "خطی Linear"], ["binary", "بائنری Binary"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["انڈیکس 3 پر", "1 موازنے کے بعد"], note: "مثال: سات اعداد کی مرتب فہرست میں 7 کی بائنری سرچ۔" },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("ان پٹ 200000 حروف سے زیادہ ہے۔", "list");
  const list = numList(input, "list", "فہرست");
  const target = num(input, "target", "مطلوبہ عدد");
  const algo = choice(input, "algo", "سرچ کی قسم", Object.keys(ALGOS), "binary");
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
    { label: "نتیجہ", value: found ? "موجود" : "موجود نہیں" },
    { label: "انڈیکس (0 سے شروع)", value: found ? String(trace.found) : "—" },
    { label: "پوزیشن (1 سے شروع)", value: found ? String(trace.found + 1) : "—" },
    { label: "موازنوں کی تعداد", value: String(trace.comparisons) },
    { label: "وقتی پیچیدگی", value: info.complexity },
    { label: `حجم n = ${n} کے لیے زیادہ سے زیادہ موازنے`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "استعمال شدہ مرتب فہرست", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `قدر ${targetText} انڈیکس ${trace.found} پر موجود ہے (پوزیشن ${trace.found + 1}) ${trace.comparisons} موازنے کے بعد`
    : `قدر ${targetText} ${trace.comparisons} موازنے کے بعد موجود نہیں`;

  const steps = [
    `الگورتھم: ${info.label}۔ ${info.description}`,
    `موازنوں کی تعداد: ${trace.comparisons}۔`,
    `وقتی پیچیدگی: ${info.complexity}، اور اس حجم کے لیے زیادہ سے زیادہ موازنے ${maxC} ہیں۔`,
    found ? `قدر ${targetText} انڈیکس ${trace.found} پر ملی، یعنی پوزیشن ${trace.found + 1} پر۔` : `فہرست میں قدر ${targetText} نہیں ملی۔`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "بائنری سرچ کے لیے فہرست کا صعودی ترتیب میں ہونا ضروری ہے، اس لیے فہرست پہلے ترتیب دی گئی، اور نتیجے اور جدول کے انڈیکس ترتیب شدہ فہرست کی طرف اشارہ کرتے ہیں۔" });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "سرچ کے مراحل کا سراغ", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `${trace.rows.length} میں سے پہلے ${MAX_ROWS} مرحلے دکھائے گئے ہیں۔` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "فہرست میں قدر ڈپلیکیٹ ہے، اور خطی سرچ اس کی پہلی پوزیشن واپس کرتی ہے۔" : "فہرست میں قدر ڈپلیکیٹ ہے، اور بائنری سرچ ان میں سے کوئی ایک پوزیشن واپس کرتی ہے، ضروری نہیں کہ پہلی ہو۔" });

  return { results, steps, blocks, copy };
}
