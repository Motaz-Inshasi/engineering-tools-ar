import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "احسب زمن نقل ملف بحجم وسرعة معيّنين مع نسبة فاقد البروتوكول، وحوّل الحجم إلى كل الوحدات العشرية والثنائية، مع توضيح الفرق بين البايت والبت وبين MB وMiB.",
  keywords: ["زمن النقل", "سرعة الإنترنت", "Mbit/s", "MB", "MiB", "بايت", "بت", "تحميل", "bandwidth", "transfer time"],
  formulas: [
    { label: "زمن النقل", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "الحجم بالبت", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "حجم الملف", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "وحدة الحجم", type: "select", default: "GB",
      options: [["B", "B (بايت)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "سرعة النقل", type: "number", default: "100" },
    {
      id: "speedUnit", label: "وحدة السرعة", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (بت في الثانية)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (بايت في الثانية)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "نسبة الفاقد في البروتوكول", unit: "%", type: "number", default: "0", help: "مثل ترويسات TCP/IP وإعادة الإرسال. يجب أن تكون أقل من 100." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "مثال: ملف 1 GB عبر وصلة 100 Mbit/s بلا فاقد." },
  invalid: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "100" } },
  related: ["number-bases", "unit-converter"]
};

export function hms(T) {
  const tot = Math.round(T);
  const h = Math.floor(tot / 3600);
  const m = Math.floor((tot % 3600) / 60);
  const s = tot % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function solve(input) {
  const size = num(input, "size", "حجم الملف", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "وحدة الحجم", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "سرعة النقل", { positive: true });
  const speedUnit = choice(input, "speedUnit", "وحدة السرعة", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "نسبة الفاقد", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "حجم الملف بالبت", value: eng(bits, "bit", 4) },
      { label: "السرعة الفعلية بعد الفاقد", value: eng(effective, "bit/s", 4) },
      { label: "زمن النقل (h:mm:ss)", value: hms(T) },
      { label: "الزمن بالثواني", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "حجم الملف بالبايت:", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "تحويل البايت إلى بت (1 B = 8 bit):", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "السرعة الفعلية بعد خصم الفاقد:", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "زمن النقل:", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "تحويل حجم الملف إلى كل الوحدات", head: ["الوحدة", "القيمة المكافئة"], rows, ltr: true },
      { type: "note", text: "1 بايت = 8 بت. تُقاس السرعة عادةً بالبت في الثانية (bit/s) بينما تُقاس الملفات بالبايت، لذلك يلزم التحويل بينهما." },
      { type: "note", text: "الوحدات العشرية (KB، MB، GB) مضاعفاتها 1000، أما الثنائية (KiB، MiB، GiB) فمضاعفاتها 1024. مثلاً: 1 MB = 1000000 بايت، و1 MiB = 1048576 بايت." }
    ]
  };
}
