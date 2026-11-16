import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "مرتب‌سازی حبابی Bubble", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "بله", counter: "جابه‌جایی‌ها (Swaps)", head: ["عبور", "مقایسه‌ها", "جابه‌جایی‌ها", "فهرست پس از عبور"], description: "الگوریتم فهرست را چندین بار می‌پیماید و در هر عبور هر عنصر را با همسایه‌اش مقایسه می‌کند و اگر به ترتیب مطلوب نبودند جابه‌جایشان می‌کند. در هر عبور بزرگ‌ترین عنصر نامرتب به انتهای فهرست می‌رود، و وقتی یک دور کامل بدون هیچ جابه‌جایی بگذرد متوقف می‌شود." },
  selection: { label: "مرتب‌سازی انتخابی Selection", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "خیر", counter: "جابه‌جایی‌ها (Swaps)", head: ["عبور", "مقدار انتخاب‌شده", "فهرست پس از عبور"], description: "در بخش نامرتب کوچک‌ترین عنصر (یا بزرگ‌ترین آن در ترتیب نزولی) را پیدا می‌کند و با حداکثر یک جابه‌جایی در اولین موقعیت نامرتب قرار می‌دهد." },
  insertion: { label: "مرتب‌سازی درجی Insertion", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "بله", counter: "جابه‌جایی‌های مکانی (Shifts)", head: ["مرحله", "عنصر درج‌شده", "جابه‌جایی‌ها", "فهرست پس از درج"], description: "هر عنصر را برمی‌دارد و در جای خودش در بخش مرتب‌شده سمت چپ آن قرار می‌دهد، و عناصری را که بعد از آن در ترتیب قرار می‌گیرند یک گام به راست منتقل می‌کند." },
  merge: { label: "مرتب‌سازی ادغامی Merge", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "بله", counter: "نوشتن‌ها (Writes)", head: ["مرحله", "بازه", "چپ", "راست", "پس از ادغام"], description: "فهرست را مکرراً به دو نیمه تقسیم می‌کند تا هر بخش یک عنصر شود، سپس هر دو بخش مرتب‌شده را در یک بخش مرتب‌شده بزرگ‌تر ادغام می‌کند." },
  quick: { label: "مرتب‌سازی سریع Quick (محور آخرین عنصر)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) به‌طور متوسط و O(n) در بدترین حالت", stable: "خیر", counter: "جابه‌جایی‌ها (Swaps)", head: ["مرحله", "بازه", "محور", "موقعیت نهایی محور", "فهرست پس از تقسیم"], description: "آخرین عنصر بازه را به عنوان محور انتخاب می‌کند، عناصر قبل از آن را به چپ و عناصر بعد از آن را به راست منتقل می‌کند، سپس همین کار را روی دو بخش تکرار می‌کند." }
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
  description: "گام به گام نشان می‌دهد که الگوریتم‌های حبابی و انتخابی و درجی و ادغامی و سریع چگونه فهرستی از اعداد را مرتب می‌کنند، همراه با تعداد مقایسه‌ها و جابه‌جایی‌ها، جدولی برای هر عبور یا مرحله، و پیچیدگی زمانی و مکانی آن‌ها.",
  keywords: ["مرتب‌سازی", "الگوریتم مرتب‌سازی", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "حبابی", "ادغامی", "سریع", "درجی", "انتخابی"],
  formulas: [
    { label: "تعداد مقایسه‌ها در مرتب‌سازی انتخابی", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "پیچیدگی ادغام", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "فهرست", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "از 2 تا 30 عدد، جداشده با ویرگول یا فاصله." },
    { id: "algo", label: "الگوریتم", type: "select", default: "bubble", options: [["bubble", "مرتب‌سازی حبابی Bubble"], ["selection", "مرتب‌سازی انتخابی Selection"], ["insertion", "مرتب‌سازی درجی Insertion"], ["merge", "مرتب‌سازی ادغامی Merge"], ["quick", "مرتب‌سازی سریع Quick (محور آخرین عنصر)"]] },
    { id: "order", label: "ترتیب خروجی", type: "select", default: "asc", options: [["asc", "صعودی"], ["desc", "نزولی"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "جابه‌جایی‌ها (Swaps): 4"], note: "مثال: حبابی روی 5, 1, 4, 2, 8 به صورت صعودی، که چهار جابه‌جایی لازم دارد." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("ورودی بیش از 200000 نویسه است.", "list");
  const list = numList(input, "list", "فهرست", { min: 2, max: 30 });
  const algo = choice(input, "algo", "الگوریتم", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "ترتیب خروجی", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "فهرست پس از مرتب‌سازی", value: sortedText, text: sortedText },
    { label: "تعداد مقایسه‌ها", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "پیچیدگی زمانی (بهترین / متوسط / بدترین)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "پیچیدگی مکانی", value: info.space },
    { label: "پایدار (Stable)", value: info.stable }
  ];

  const steps = [
    `الگوریتم: ${info.label}. ${info.description}`,
    `ترتیب خروجی: ${ORDERS[order]}.`,
    `تعداد مقایسه‌ها: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `پیچیدگی زمانی: بهترین حالت ${info.best}، متوسط ${info.average}، بدترین حالت ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "ردیابی مراحل الگوریتم", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `فقط ${MAX_ROWS} مرحله اول از ${run.rows.length} مرحله نمایش داده شد.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `الگوریتم پس از عبور ${run.rows.length} زودتر متوقف شد، زیرا این عبور هیچ جابه‌جایی انجام نداد و فهرست مرتب شده است.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | مقایسه‌ها: ${compText}`
  };
}
