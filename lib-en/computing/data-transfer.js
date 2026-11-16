import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "Calculate the transfer time of a file of a given size and speed, including the protocol overhead ratio, and convert the size into all decimal and binary units, explaining the difference between bytes and bits and between MB and MiB.",
  keywords: ["transfer time", "internet speed", "Mbit/s", "MB", "MiB", "byte", "bit", "download", "bandwidth", "transfer time"],
  formulas: [
    { label: "transfer time", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "Size in bits", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "File size", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "Size unit", type: "select", default: "GB",
      options: [["B", "B (bytes)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "Transfer speed", type: "number", default: "100" },
    {
      id: "speedUnit", label: "Speed unit", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (bits per second)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (bytes per second)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "Protocol overhead ratio", unit: "%", type: "number", default: "0", help: "Such as TCP/IP headers and retransmission. Must be less than 100." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "Example: a 1 GB file over a 100 Mbit/s link with no loss." },
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
  const size = num(input, "size", "File size", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "Size unit", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "Transfer speed", { positive: true });
  const speedUnit = choice(input, "speedUnit", "Speed unit", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "Overhead ratio", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "File size in bits", value: eng(bits, "bit", 4) },
      { label: "Effective speed after overhead", value: eng(effective, "bit/s", 4) },
      { label: "Transfer time (h:mm:ss)", value: hms(T) },
      { label: "Time in seconds", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "File size in bytes:", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "Converting bytes to bits (1 B = 8 bit):", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "Effective speed after subtracting the overhead:", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "Transfer time:", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "File size conversion to all units", head: ["Unit", "Equivalent value"], rows, ltr: true },
      { type: "note", text: "1 byte = 8 bits. Speed is usually measured in bits per second (bit/s) while files are measured in bytes, so a conversion between them is needed." },
      { type: "note", text: "Decimal units (KB, MB, GB) have multiples of 1000, while binary units (KiB, MiB, GiB) have multiples of 1024. For example: 1 MB = 1000000 bytes, and 1 MiB = 1048576 bytes." }
    ]
  };
}
