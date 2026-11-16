import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "بلبلہ Bubble", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "ہاں", counter: "سوئیچز (Swaps)", head: ["پاس", "موازنے", "سوئیچز", "پاس کے بعد فہرست"], description: "الگورتھم فہرست پر بار بار گزرتا ہے، اور ہر پاس میں ہر عنصر کو اس کے پڑوسی سے موازنہ کرتا ہے اور اگر وہ مطلوبہ ترتیب میں نہ ہوں تو ان کی جگہ بدل دیتا ہے۔ ہر پاس میں سب سے بڑا غیر ترتیب شدہ عنصر آخر تک پہنچ جاتا ہے، اور اگر ایک مکمل پاس بغیر کسی سوئیچ کے گزرے تو رک جاتا ہے۔" },
  selection: { label: "انتخاب Selection", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "نہیں", counter: "سوئیچز (Swaps)", head: ["پاس", "منتخب قدر", "پاس کے بعد فہرست"], description: "غیر ترتیب شدہ حصے میں سب سے چھوٹا عنصر تلاش کرتا ہے (یا ترتیب نزولی ہو تو سب سے بڑا)، پھر اسے زیادہ سے زیادہ ایک سوئیچ کے ذریعے پہلی غیر ترتیب شدہ جگہ پر رکھتا ہے۔" },
  insertion: { label: "اندراج Insertion", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "ہاں", counter: "شفٹس (Shifts)", head: ["مرحلہ", "داخل کیا گیا عنصر", "شفٹس", "اندراج کے بعد فہرست"], description: "ہر عنصر کو لے کر اسے اس کے بائیں طرف والے ترتیب شدہ حصے میں اس کی درست جگہ پر داخل کرتا ہے، اور اس کے بعد آنے والے ان عناصر کو ایک قدم دائیں کھسکاتا ہے جو ترتیب میں اس سے بعد میں آتے ہیں۔" },
  merge: { label: "انضمام Merge", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "ہاں", counter: "تحریریں (Writes)", head: ["مرحلہ", "دائرہ", "بائیں", "دائیں", "انضمام کے بعد"], description: "فہرست کو بار بار دو حصوں میں تقسیم کرتا ہے یہاں تک کہ ہر حصہ ایک عنصر بن جائے، پھر ہر دو ترتیب شدہ حصوں کو ملا کر ایک بڑا ترتیب شدہ حصہ بناتا ہے۔" },
  quick: { label: "تیز Quick (محور آخری عنصر)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "اوسطاً O(log n) اور بدترین صورت میں O(n)", stable: "نہیں", counter: "سوئیچز (Swaps)", head: ["مرحلہ", "دائرہ", "محور", "محور کی حتمی پوزیشن", "تقسیم کے بعد فہرست"], description: "محور کے طور پر دائرے کا آخری عنصر منتخب کرتا ہے، اس سے چھوٹے عناصر کو اس کے بائیں اور بڑے عناصر کو دائیں منتقل کرتا ہے، پھر دونوں حصوں پر یہی عمل دہراتا ہے۔" }
};

const ORDERS = { asc: "صعودی", desc: "نزولی" };

function fmtNum(x) {
  return fmt(x, 10);
}

function snapshot(a) {
  return a.map(fmtNum).join(", ");
}

function runBubble(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0, early = false;
  for (let p = 0; p < n - 1; p++) {
    let c = 0, s = 0;
    for (let j = 0; j < n - 1 - p; j++) {
      comparisons++;
      c++;
      if (dir * (a[j] - a[j + 1]) > 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        s++;
      }
    }
    rows.push([String(p + 1), String(c), String(s), snapshot(a)]);
    if (s === 0) {
      early = p < n - 2;
      break;
    }
  }
  return { rows, comparisons, count: swaps, early };
}

function runSelection(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0;
  for (let i = 0; i < n - 1; i++) {
    let best = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (dir * (a[j] - a[best]) < 0) best = j;
    }
    const chosen = a[best];
    if (best !== i) {
      [a[i], a[best]] = [a[best], a[i]];
      swaps++;
    }
    rows.push([String(i + 1), fmtNum(chosen), snapshot(a)]);
  }
  return { rows, comparisons, count: swaps, early: false };
}

function runInsertion(a, dir) {
  const rows = [];
  let comparisons = 0, shifts = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    let s = 0;
    while (j >= 0) {
      comparisons++;
      if (dir * (a[j] - key) > 0) {
        a[j + 1] = a[j];
        shifts++;
        s++;
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    rows.push([String(i), fmtNum(key), String(s), snapshot(a)]);
  }
  return { rows, comparisons, count: shifts, early: false };
}

function runMerge(a, dir) {
  const rows = [];
  let comparisons = 0, writes = 0;
  const merge = (lo, mid, hi) => {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (dir * (left[i] - right[j]) <= 0) a[k++] = left[i++];
      else a[k++] = right[j++];
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
    writes += hi - lo + 1;
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, snapshot(left), snapshot(right), snapshot(a.slice(lo, hi + 1))]);
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sortRange(lo, mid);
    sortRange(mid + 1, hi);
    merge(lo, mid, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: writes, early: false };
}

function runQuick(a, dir) {
  const rows = [];
  let comparisons = 0, swaps = 0;
  const swap = (x, y) => {
    if (x !== y) {
      [a[x], a[y]] = [a[y], a[x]];
      swaps++;
    }
  };
  const partition = (lo, hi) => {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (dir * (a[j] - pivot) <= 0) {
        swap(i, j);
        i++;
      }
    }
    swap(i, hi);
    return { p: i, pivot };
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const { p, pivot } = partition(lo, hi);
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, fmtNum(pivot), String(p + 1), snapshot(a)]);
    sortRange(lo, p - 1);
    sortRange(p + 1, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: swaps, early: false };
}

const RUNNERS = { bubble: runBubble, selection: runSelection, insertion: runInsertion, merge: runMerge, quick: runQuick };

export const meta = {
  description: "بلبلہ، انتخاب، اندراج، انضمام اور تیز الگورتھم کسی عددی فہرست کو کیسے ترتیب دیتے ہیں، قدم بہ قدم دکھاتا ہے، ساتھ میں موازنوں اور سوئیچز کی تعداد، ہر پاس یا مرحلے کا جدول، اور وقتی و مکانی پیچیدگی۔",
  keywords: ["ترتیب", "ترتیب کا الگورتھم", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "بلبلہ", "انضمام", "تیز", "اندراج", "انتخاب"],
  formulas: [
    { label: "انتخاب میں موازنوں کی تعداد", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "انضمام کی پیچیدگی", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "فہرست", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "2 سے 30 اعداد تک، کوما یا خالی جگہ سے الگ کیے ہوئے۔" },
    { id: "algo", label: "الگورتھم", type: "select", default: "bubble", options: [["bubble", "بلبلہ Bubble"], ["selection", "انتخاب Selection"], ["insertion", "اندراج Insertion"], ["merge", "انضمام Merge"], ["quick", "تیز Quick (محور آخری عنصر)"]] },
    { id: "order", label: "نتیجے کی ترتیب", type: "select", default: "asc", options: [["asc", "صعودی"], ["desc", "نزولی"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "سوئیچز (Swaps): 4"], note: "مثال: 5, 1, 4, 2, 8 پر بلبلہ الگورتھم صعودی ترتیب میں، جس میں چار سوئیچز درکار ہیں۔" },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("ان پٹ 200000 حروف سے زیادہ ہے۔", "list");
  const list = numList(input, "list", "فہرست", { min: 2, max: 30 });
  const algo = choice(input, "algo", "الگورتھم", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "نتیجے کی ترتیب", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "ترتیب کے بعد فہرست", value: sortedText, text: sortedText },
    { label: "موازنوں کی تعداد", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "وقتی پیچیدگی (بہترین / اوسط / بدترین)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "مکانی پیچیدگی", value: info.space },
    { label: "مستحکم (Stable)", value: info.stable }
  ];

  const steps = [
    `الگورتھم: ${info.label}۔ ${info.description}`,
    `نتیجے کی ترتیب: ${ORDERS[order]}۔`,
    `موازنوں کی تعداد: ${compText}۔`,
    `${info.counter}: ${countText}.`,
    `وقتی پیچیدگی: بہترین صورت ${info.best}، اوسط ${info.average}، بدترین صورت ${info.worst}۔`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "الگورتھم کے مراحل کا سراغ", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `${run.rows.length} میں سے پہلے ${MAX_ROWS} مرحلے دکھائے گئے ہیں۔`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `الگورتھم ${run.rows.length} پاس کے بعد جلدی رک گیا، کیونکہ اس پاس میں کوئی سوئیچ نہیں ہوا، یعنی فہرست ترتیب شدہ ہو چکی ہے۔` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | موازنے: ${compText}`
  };
}
