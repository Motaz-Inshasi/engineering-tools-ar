import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "Bubble sort", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes", counter: "Swaps", head: ["Pass", "Comparisons", "Swaps", "List after pass"], description: "The algorithm makes repeated passes over the list. In each pass, it compares each item with its neighbor and swaps them if they are not in the required order. The largest unsorted item rises to the end of the list in each pass, and the algorithm stops when a full pass makes no swaps." },
  selection: { label: "Selection sort", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "No", counter: "Swaps", head: ["Pass", "Selected value", "List after pass"], description: "It searches the unsorted part for the smallest item (or the largest in descending order), then places it in the first unsorted position with at most one swap." },
  insertion: { label: "Insertion sort", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes", counter: "Shifts", head: ["Step", "Inserted item", "Shifts", "List after insertion"], description: "Each item is taken and inserted at its position within the sorted part on its left, shifting the items that come after it in the order one step to the right." },
  merge: { label: "Merge sort", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Yes", counter: "Writes", head: ["Step", "Range", "Left", "Right", "After merge"], description: "The list is repeatedly split into two halves until each part is a single item, then every two sorted parts are merged into a larger sorted part." },
  quick: { label: "Quick sort (pivot is the last element)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) on average and O(n) in the worst case", stable: "No", counter: "Swaps", head: ["Step", "Range", "Pivot", "Final pivot position", "List after partition"], description: "The pivot is the last item in the range. Items before it are moved to its left and items after it are moved to its right, then the process is repeated on both parts." }
};

const ORDERS = { asc: "Ascending", desc: "Descending" };

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
  description: "A step-by-step trace of how bubble, selection, insertion, merge, and quick sort arrange a list of numbers, showing the number of comparisons and swaps, a table for each pass or step, and their time and space complexity.",
  keywords: ["sorting", "sorting algorithm", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "bubble", "merge", "quick", "insertion", "selection"],
  formulas: [
    { label: "Number of comparisons in selection sort", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "Merge sort complexity", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "List", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "From 2 to 30 numbers, separated by commas or spaces." },
    { id: "algo", label: "Algorithm", type: "select", default: "bubble", options: [["bubble", "Bubble sort"], ["selection", "Selection sort"], ["insertion", "Insertion sort"], ["merge", "Merge sort"], ["quick", "Quick sort (pivot is the last element)"]] },
    { id: "order", label: "Result order", type: "select", default: "asc", options: [["asc", "Ascending"], ["desc", "Descending"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "Swaps: 4"], note: "Example: bubble sort on 5, 1, 4, 2, 8 in ascending order, which needs four swaps." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("The input is longer than 200000 characters.", "list");
  const list = numList(input, "list", "List", { min: 2, max: 30 });
  const algo = choice(input, "algo", "Algorithm", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "Result order", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "List after sorting", value: sortedText, text: sortedText },
    { label: "Comparisons", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "Time complexity (best / average / worst)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "Space complexity", value: info.space },
    { label: "Stable", value: info.stable }
  ];

  const steps = [
    `Algorithm: ${info.label}. ${info.description}`,
    `Result order: ${ORDERS[order]}.`,
    `Comparisons: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `Time complexity: best case ${info.best}, average ${info.average}, worst case ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "Algorithm steps trace", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `Showing the first ${MAX_ROWS} steps out of ${run.rows.length} steps.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `The algorithm stopped early after pass ${run.rows.length} because that pass made no swaps, so the list is already sorted.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | Comparisons: ${compText}`
  };
}
