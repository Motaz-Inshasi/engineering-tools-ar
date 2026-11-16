import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "جست‌وجوی خطی Linear", complexity: "O(n)", head: ["مرحله", "اندیس", "مقدار", "برابر با هدف؟"], description: "عناصر را یکی‌یکی از ابتدا بررسی می‌کنیم و وقتی به اولین عنصری که برابر مقدار هدف است یا به انتهای فهرست برسیم متوقف می‌شویم. ترتیب فهرست لازم نیست." },
  binary: { label: "جست‌وجوی دودویی Binary", complexity: "O(log n)", head: ["مرحله", "کوچک‌ترین اندیس (low)", "بزرگ‌ترین اندیس (high)", "اندیس میانی (mid)", "مقدار در mid", "مقایسه", "اقدام"], description: "مقدار هدف را با عنصر میانی بازه فعلی مقایسه می‌کنیم، سپس نیمی را که مقدار هدف نمی‌تواند در آن باشد حذف می‌کنیم، و این کار را تکرار می‌کنیم تا آن را پیدا کنیم یا بازه خالی شود. فهرست باید به صورت صعودی مرتب باشد." }
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
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "بله" : "خیر"]);
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
    const action = sym === "=" ? `مقدار در اندیس ${mid} پیدا شد` : sym === "<" ? "مقدار هدف کوچک‌تر است، پس در نیمه چپ جست‌وجو می‌کنیم" : "مقدار هدف بزرگ‌تر است، پس در نیمه راست جست‌وجو می‌کنیم";
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
  description: "جست‌وجوی خطی و جست‌وجوی دودویی را گام به گام روی فهرستی از اعداد دنبال می‌کند و موقعیت مقدار را در صورت وجود، تعداد مقایسه‌ها و حداکثر تعداد مقایسه ممکن برای اندازه فهرست را نمایش می‌دهد.",
  keywords: ["جست‌وجو", "جست‌وجوی خطی", "جست‌وجوی دودویی", "linear search", "binary search", "الگوریتم جست‌وجو", "اندیس", "لگاریتمی"],
  formulas: [
    { label: "حداکثر تعداد مقایسه در جست‌وجوی دودویی", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "حداکثر تعداد مقایسه در جست‌وجوی خطی", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "فهرست", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "اعداد جداشده با ویرگول یا فاصله. جست‌وجوی دودویی به فهرست مرتب نیاز دارد و اگر فهرست مرتب نباشد ابتدا مرتب می‌شود." },
    { id: "target", label: "عدد مورد نظر", type: "number", default: "7" },
    { id: "algo", label: "نوع جست‌وجو", type: "select", default: "binary", options: [["linear", "جست‌وجوی خطی Linear"], ["binary", "جست‌وجوی دودویی Binary"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["در اندیس 3", "پس از 1 مقایسه"], note: "مثال: جست‌وجوی دودویی برای 7 در فهرستی مرتب از هفت عدد." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("ورودی بیش از 200000 نویسه است.", "list");
  const list = numList(input, "list", "فهرست");
  const target = num(input, "target", "عدد مورد نظر");
  const algo = choice(input, "algo", "نوع جست‌وجو", Object.keys(ALGOS), "binary");
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
    { label: "نتیجه", value: found ? "پیدا شد" : "پیدا نشد" },
    { label: "اندیس (از 0)", value: found ? String(trace.found) : "—" },
    { label: "موقعیت (از 1)", value: found ? String(trace.found + 1) : "—" },
    { label: "تعداد مقایسه‌ها", value: String(trace.comparisons) },
    { label: "پیچیدگی زمانی", value: info.complexity },
    { label: `حداکثر تعداد مقایسه برای اندازه n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "فهرست مرتب‌شده استفاده‌شده", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `مقدار ${targetText} در اندیس ${trace.found} (موقعیت ${trace.found + 1}) پس از ${trace.comparisons} مقایسه پیدا شد`
    : `مقدار ${targetText} پس از ${trace.comparisons} مقایسه پیدا نشد`;

  const steps = [
    `الگوریتم: ${info.label}. ${info.description}`,
    `تعداد مقایسه‌ها: ${trace.comparisons}.`,
    `پیچیدگی زمانی: ${info.complexity}، و حداکثر تعداد مقایسه برای این اندازه ${maxC} است.`,
    found ? `مقدار ${targetText} در اندیس ${trace.found} یعنی در موقعیت ${trace.found + 1} پیدا شد.` : `مقدار ${targetText} در فهرست پیدا نشد.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "جست‌وجوی دودویی به فهرستی مرتب به صورت صعودی نیاز دارد، پس فهرست ابتدا مرتب شد و اندیس‌ها در نتیجه و جدول به فهرست مرتب‌شده اشاره می‌کنند." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "ردیابی مراحل جست‌وجو", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `فقط ${MAX_ROWS} مرحله اول از ${trace.rows.length} مرحله نمایش داده شد.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "مقدار در فهرست تکراری است، و جست‌وجوی خطی اولین موقعیت آن را برمی‌گرداند." : "مقدار در فهرست تکراری است، و جست‌وجوی دودویی یکی از موقعیت‌های آن را برمی‌گرداند، که لزوماً اولین موقعیت نیست." });

  return { results, steps, blocks, copy };
}
