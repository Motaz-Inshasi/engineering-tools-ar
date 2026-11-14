import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "الفقاعات Bubble", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "نعم", counter: "التبديلات (Swaps)", head: ["المرور", "المقارنات", "التبديلات", "القائمة بعد المرور"], description: "تمرّ الخوارزمية على القائمة مراراً، وفي كل مرور تقارن كل عنصر بجاره وتبدّلهما إذا كانا في غير ترتيبهما المطلوب. يصعد أكبر عنصر غير مرتب إلى نهاية القائمة في كل مرور، وتتوقف إذا مرّ دور كامل دون أي تبديل." },
  selection: { label: "الاختيار Selection", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "لا", counter: "التبديلات (Swaps)", head: ["المرور", "القيمة المختارة", "القائمة بعد المرور"], description: "تبحث في الجزء غير المرتب عن أصغر عنصر (أو أكبرها في الترتيب التنازلي)، ثم تضعه في أول موضع غير مرتب بتبديل واحد على الأكثر." },
  insertion: { label: "الإدراج Insertion", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "نعم", counter: "الإزاحات (Shifts)", head: ["الخطوة", "العنصر المُدرج", "الإزاحات", "القائمة بعد الإدراج"], description: "تأخذ كل عنصر وتدرجه في موضعه داخل الجزء المرتب الذي على يساره، بإزاحة العناصر التي تأتي بعده في الترتيب خطوة إلى اليمين." },
  merge: { label: "الدمج Merge", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "نعم", counter: "الكتابات (Writes)", head: ["الخطوة", "النطاق", "اليسار", "اليمين", "بعد الدمج"], description: "تقسم القائمة إلى نصفين بشكل متكرر حتى يصبح كل جزء عنصراً واحداً، ثم تدمج كل جزأين مرتبين في جزء مرتب أكبر." },
  quick: { label: "السريع Quick (المحور آخر عنصر)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) متوسطاً و O(n) في الأسوأ", stable: "لا", counter: "التبديلات (Swaps)", head: ["الخطوة", "النطاق", "المحور", "موضع المحور النهائي", "القائمة بعد التقسيم"], description: "تختار المحور وهو آخر عنصر في النطاق، وتنقل العناصر التي تسبقه إلى يساره والتي تليه إلى يمينه، ثم تكرر العملية على الجزأين." }
};

const ORDERS = { asc: "تصاعدي", desc: "تنازلي" };

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
  description: "تتبّع خطوة بخطوة كيف ترتّب خوارزميات الفقاعات والاختيار والإدراج والدمج والسريع قائمة أعداد، مع عدد المقارنات والتبديلات وجدول لكل مرور أو خطوة وتعقيدها الزمني والمكاني.",
  keywords: ["ترتيب", "خوارزمية الترتيب", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "فقاعات", "دمج", "سريع", "إدراج", "اختيار"],
  formulas: [
    { label: "عدد المقارنات في الاختيار", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "تعقيد الدمج", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "القائمة", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "من 2 إلى 30 عدداً، مفصولة بفواصل أو مسافات." },
    { id: "algo", label: "الخوارزمية", type: "select", default: "bubble", options: [["bubble", "الفقاعات Bubble"], ["selection", "الاختيار Selection"], ["insertion", "الإدراج Insertion"], ["merge", "الدمج Merge"], ["quick", "السريع Quick (المحور آخر عنصر)"]] },
    { id: "order", label: "ترتيب النتيجة", type: "select", default: "asc", options: [["asc", "تصاعدي"], ["desc", "تنازلي"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "التبديلات (Swaps): 4"], note: "مثال: فقاعات على 5, 1, 4, 2, 8 تصاعدياً، وتحتاج أربع تبديلات." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("المدخل أطول من 200000 حرف.", "list");
  const list = numList(input, "list", "القائمة", { min: 2, max: 30 });
  const algo = choice(input, "algo", "الخوارزمية", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "ترتيب النتيجة", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "القائمة بعد الترتيب", value: sortedText, text: sortedText },
    { label: "عدد المقارنات", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "التعقيد الزمني (أفضل / متوسط / أسوأ)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "التعقيد المكاني", value: info.space },
    { label: "مستقر (Stable)", value: info.stable }
  ];

  const steps = [
    `الخوارزمية: ${info.label}. ${info.description}`,
    `ترتيب النتيجة: ${ORDERS[order]}.`,
    `عدد المقارنات: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `التعقيد الزمني: أفضل حالة ${info.best}، متوسط ${info.average}، أسوأ حالة ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "تتبّع خطوات الخوارزمية", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `عُرضت أول ${MAX_ROWS} خطوة من أصل ${run.rows.length} خطوة.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `توقفت الخوارزمية مبكراً بعد المرور ${run.rows.length} لأن هذا المرور لم يُجرِ أي تبديل، فالقائمة صارت مرتبة.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | المقارنات: ${compText}`
  };
}
