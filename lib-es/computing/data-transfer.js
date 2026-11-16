import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "Calcula el tiempo de transferencia de un archivo de un tamaño y una velocidad dados, incluido el porcentaje de sobrecarga del protocolo, y convierte el tamaño a todas las unidades decimales y binarias, explicando la diferencia entre byte y bit, y entre MB y MiB.",
  keywords: ["tiempo de transferencia", "velocidad de internet", "Mbit/s", "MB", "MiB", "byte", "bit", "descarga", "bandwidth", "transfer time"],
  formulas: [
    { label: "tiempo de transferencia", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "Tamaño en bits", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "Tamaño del archivo", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "Unidad de tamaño", type: "select", default: "GB",
      options: [["B", "B (bytes)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "Velocidad de transferencia", type: "number", default: "100" },
    {
      id: "speedUnit", label: "Unidad de velocidad", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (bits por segundo)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (bytes por segundo)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "Porcentaje de sobrecarga del protocolo", unit: "%", type: "number", default: "0", help: "Como las cabeceras TCP/IP y las retransmisiones. Debe ser menor que 100." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "Ejemplo: un archivo de 1 GB por un enlace de 100 Mbit/s sin pérdidas." },
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
  const size = num(input, "size", "Tamaño del archivo", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "Unidad de tamaño", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "Velocidad de transferencia", { positive: true });
  const speedUnit = choice(input, "speedUnit", "Unidad de velocidad", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "Porcentaje de sobrecarga", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "Tamaño del archivo en bits", value: eng(bits, "bit", 4) },
      { label: "Velocidad efectiva tras la sobrecarga", value: eng(effective, "bit/s", 4) },
      { label: "Tiempo de transferencia (h:mm:ss)", value: hms(T) },
      { label: "Tiempo en segundos", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "Tamaño del archivo en bytes:", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "Conversión de bytes a bits (1 B = 8 bit):", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "Velocidad efectiva tras descontar la sobrecarga:", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "Tiempo de transferencia:", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "Conversión del tamaño del archivo a todas las unidades", head: ["Unidad", "Valor equivalente"], rows, ltr: true },
      { type: "note", text: "1 byte = 8 bits. La velocidad suele medirse en bits por segundo (bit/s), mientras que los archivos se miden en bytes, por lo que es necesario convertir entre ambos." },
      { type: "note", text: "Las unidades decimales (KB, MB, GB) tienen múltiplos de 1000, mientras que las binarias (KiB, MiB, GiB) tienen múltiplos de 1024. Por ejemplo: 1 MB = 1000000 bytes y 1 MiB = 1048576 bytes." }
    ]
  };
}
