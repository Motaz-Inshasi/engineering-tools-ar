import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "Linear search", complexity: "O(n)", head: ["Step", "Index", "Value", "Equals target?"], description: "Items are checked one by one from the start, and the search stops at the first item equal to the required value or at the end of the list. The list does not need to be sorted." },
  binary: { label: "Binary search", complexity: "O(log n)", head: ["Step", "Lowest index (low)", "Highest index (high)", "Middle index (mid)", "Value at mid", "Comparison", "Action"], description: "The required value is compared with the middle item of the current range, then the half where the value cannot be is discarded, and this is repeated until the value is found or the range is empty. The list must be sorted in ascending order." }
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
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "Yes" : "No"]);
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
    const action = sym === "=" ? `Found the value at index ${mid}` : sym === "<" ? "The required value is smaller, so we search the left half" : "The required value is larger, so we search the right half";
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
  description: "Traces linear and binary search step by step on a list of numbers, showing the position of the value if it is found, the number of comparisons, and the maximum number of comparisons possible for the list size.",
  keywords: ["search", "linear search", "binary search", "linear search", "binary search", "search algorithm", "Index", "logarithmic"],
  formulas: [
    { label: "Maximum comparisons in binary search", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "Maximum comparisons in linear search", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "List", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "Numbers separated by commas or spaces. Binary search requires a sorted list; if it is not sorted, it will be sorted first." },
    { id: "target", label: "Target number", type: "number", default: "7" },
    { id: "algo", label: "Search type", type: "select", default: "binary", options: [["linear", "Linear search"], ["binary", "Binary search"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["at index 3", "after 1 comparison"], note: "Example: binary search for 7 in a sorted list of seven numbers." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("The input is longer than 200000 characters.", "list");
  const list = numList(input, "list", "List");
  const target = num(input, "target", "Target number");
  const algo = choice(input, "algo", "Search type", Object.keys(ALGOS), "binary");
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
    { label: "Result", value: found ? "Found" : "Not found" },
    { label: "Index (0-based)", value: found ? String(trace.found) : "—" },
    { label: "Position (1-based)", value: found ? String(trace.found + 1) : "—" },
    { label: "Comparisons", value: String(trace.comparisons) },
    { label: "Time complexity", value: info.complexity },
    { label: `Maximum comparisons for size n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "Sorted list used", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `The value ${targetText} is at index ${trace.found} (position ${trace.found + 1}) after ${trace.comparisons} comparisons`
    : `The value ${targetText} was not found after ${trace.comparisons} comparisons`;

  const steps = [
    `Algorithm: ${info.label}. ${info.description}`,
    `Comparisons: ${trace.comparisons}.`,
    `Time complexity: ${info.complexity}, and the maximum number of comparisons for this size is ${maxC}.`,
    found ? `The value ${targetText} was found at index ${trace.found}, i.e. at position ${trace.found + 1}.` : `The value ${targetText} was not found in the list.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "Binary search requires a list sorted in ascending order, so the list was sorted first, and the indexes in the result and the table refer to the sorted list." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "Search steps trace", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Showing the first ${MAX_ROWS} steps out of ${trace.rows.length} steps.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "The value is duplicated in the list, and linear search returns its first position." : "The value is duplicated in the list, and binary search returns one of its positions, not necessarily the first." });

  return { results, steps, blocks, copy };
}
