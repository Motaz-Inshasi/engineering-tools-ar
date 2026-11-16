import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "محاسبه زمان انتقال یک فایل با اندازه و سرعت معین همراه با نسبت سربار پروتکل، و تبدیل اندازه به همه واحدهای اعشاری و دودویی، با توضیح تفاوت بایت و بیت و میان MB و MiB.",
  keywords: ["زمان انتقال", "سرعت اینترنت", "Mbit/s", "MB", "MiB", "بایت", "بیت", "دانلود", "bandwidth", "transfer time"],
  formulas: [
    { label: "زمان انتقال", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "اندازه بر حسب بیت", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "اندازه فایل", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "واحد اندازه", type: "select", default: "GB",
      options: [["B", "B (بایت)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "سرعت انتقال", type: "number", default: "100" },
    {
      id: "speedUnit", label: "واحد سرعت", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (بیت بر ثانیه)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (بایت بر ثانیه)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "نسبت سربار پروتکل", unit: "%", type: "number", default: "0", help: "مثل سرآیند TCP/IP و ارسال مجدد. باید کمتر از 100 باشد." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "مثال: فایل 1 GB از طریق پیوند 100 Mbit/s بدون اتلاف." },
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
  const size = num(input, "size", "اندازه فایل", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "واحد اندازه", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "سرعت انتقال", { positive: true });
  const speedUnit = choice(input, "speedUnit", "واحد سرعت", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "نسبت سربار", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "اندازه فایل بر حسب بیت", value: eng(bits, "bit", 4) },
      { label: "سرعت مؤثر پس از سربار", value: eng(effective, "bit/s", 4) },
      { label: "زمان انتقال (h:mm:ss)", value: hms(T) },
      { label: "زمان بر حسب ثانیه", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "اندازه فایل بر حسب بایت:", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "تبدیل بایت به بیت (1 B = 8 bit):", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "سرعت مؤثر پس از کم کردن سربار:", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "زمان انتقال:", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "تبدیل اندازه فایل به همه واحدها", head: ["واحد", "مقدار معادل"], rows, ltr: true },
      { type: "note", text: "1 بایت = 8 بیت. سرعت معمولاً بر حسب بیت بر ثانیه (bit/s) سنجیده می‌شود، در حالی که فایل‌ها بر حسب بایت سنجیده می‌شوند، پس تبدیل میان آن‌ها لازم است." },
      { type: "note", text: "واحدهای اعشاری (KB، MB، GB) مضرب‌هایشان 1000 است و واحدهای دودویی (KiB، MiB، GiB) مضرب‌هایشان 1024 است. مثلاً: 1 MB = 1000000 بایت و 1 MiB = 1048576 بایت." }
    ]
  };
}
