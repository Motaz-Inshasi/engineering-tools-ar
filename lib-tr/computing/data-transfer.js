import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "Belirli boyut ve hızda bir dosyanın aktarım süresini protokol kayıp oranıyla hesaplayın; boyutu tüm ondalık ve ikilik birimlere çevirin, bayt ile bit ve MB ile MiB arasındaki farkı açıklayın.",
  keywords: ["aktarım süresi", "internet hızı", "Mbit/s", "MB", "MiB", "bayt", "bit", "indirme", "bandwidth", "transfer time"],
  formulas: [
    { label: "aktarım süresi", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "Boyut bit cinsinden", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "Dosya boyutu", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "Boyut birimi", type: "select", default: "GB",
      options: [["B", "B (bayt)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "Aktarım hızı", type: "number", default: "100" },
    {
      id: "speedUnit", label: "Hız birimi", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (bit/saniye)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (bayt/saniye)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "Protokol kayıp oranı", unit: "%", type: "number", default: "0", help: "TCP/IP başlıkları ve yeniden iletim gibi. 100'den küçük olmalıdır." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "Örnek: 100 Mbit/s bağlantıda kayıpsız 1 GB dosya." },
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
  const size = num(input, "size", "Dosya boyutu", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "Boyut birimi", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "Aktarım hızı", { positive: true });
  const speedUnit = choice(input, "speedUnit", "Hız birimi", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "Kayıp oranı", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "Dosya boyutu bit cinsinden", value: eng(bits, "bit", 4) },
      { label: "Kayıp sonrası gerçek hız", value: eng(effective, "bit/s", 4) },
      { label: "Aktarım süresi (s:dk:sn)", value: hms(T) },
      { label: "Süre saniye cinsinden", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "Dosya boyutu bayt cinsinden:", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "Baytı bite çevirme (1 B = 8 bit):", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "Kayıp düşüldükten sonra gerçek hız:", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "Aktarım süresi:", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "Dosya boyutunun tüm birimlere dönüşümü", head: ["Birim", "Karşılık gelen değer"], rows, ltr: true },
      { type: "note", text: "1 bayt = 8 bit. Hız genellikle bit/s, dosyalar ise bayt ile ölçülür; bu nedenle ikisi arasında dönüşüm gerekir." },
      { type: "note", text: "Ondalık birimlerin (KB, MB, GB) katları 1000'dir; ikilik birimlerin (KiB, MiB, GiB) katları ise 1024'tür. Örneğin 1 MB = 1000000 bayt, 1 MiB = 1048576 bayt." }
    ]
  };
}
