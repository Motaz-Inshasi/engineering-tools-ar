import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";

const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30, TiB: 2 ** 40 };
const SPEED_UNITS = { "bit/s": 1, "kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9, "B/s": 8, "KB/s": 8e3, "MB/s": 8e6 };

export const meta = {
  description: "Calculez le temps de transfert d'un fichier de taille et de débit donnés avec le taux de perte du protocole, convertissez la taille dans toutes les unités décimales et binaires, et expliquez la différence entre octet et bit ainsi qu'entre MB et MiB.",
  keywords: ["Temps de transfert", "Débit internet", "Mbit/s", "MB", "MiB", "octet", "bit", "téléchargement", "bandwidth", "transfer time"],
  formulas: [
    { label: "Temps de transfert", tex: "t = \\frac{8 \\cdot V_{\\text{bytes}}}{S_{\\text{bit/s}} \\left(1 - \\frac{\\text{overhead}}{100}\\right)}" },
    { label: "Taille en bits", tex: "1\\ \\text{B} = 8\\ \\text{bit},\\qquad 1\\ \\text{MB} = 10^6\\ \\text{B},\\qquad 1\\ \\text{MiB} = 2^{20}\\ \\text{B}" }
  ],
  inputs: [
    { id: "size", label: "Taille du fichier", type: "number", default: "1" },
    {
      id: "sizeUnit", label: "Unité de taille", type: "select", default: "GB",
      options: [["B", "B (octet)"], ["KB", "KB (1000 B)"], ["MB", "MB (10^6 B)"], ["GB", "GB (10^9 B)"], ["TB", "TB (10^12 B)"], ["KiB", "KiB (1024 B)"], ["MiB", "MiB (1024² B)"], ["GiB", "GiB (1024³ B)"], ["TiB", "TiB (1024⁴ B)"]]
    },
    { id: "speed", label: "Débit de transfert", type: "number", default: "100" },
    {
      id: "speedUnit", label: "Unité de débit", type: "select", default: "Mbit/s",
      options: [["bit/s", "bit/s (bit par seconde)"], ["kbit/s", "kbit/s"], ["Mbit/s", "Mbit/s"], ["Gbit/s", "Gbit/s"], ["B/s", "B/s (octet par seconde)"], ["KB/s", "KB/s"], ["MB/s", "MB/s"]]
    },
    { id: "overhead", label: "Taux de perte du protocole", unit: "%", type: "number", default: "0", help: "Comme les en-têtes TCP/IP et les retransmissions. Doit être inférieur à 100." }
  ],
  example: { values: { size: "1", sizeUnit: "GB", speed: "100", speedUnit: "Mbit/s", overhead: "0" }, expect: ["80 s", "0:01:20"], note: "Exemple : fichier de 1 GB via une liaison de 100 Mbit/s sans perte." },
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
  const size = num(input, "size", "Taille du fichier", { positive: true });
  const sizeUnit = choice(input, "sizeUnit", "Unité de taille", Object.keys(SIZE_UNITS), "GB");
  const speed = num(input, "speed", "Débit de transfert", { positive: true });
  const speedUnit = choice(input, "speedUnit", "Unité de débit", Object.keys(SPEED_UNITS), "Mbit/s");
  const overhead = num(input, "overhead", "Taux de perte", { nonNegative: true, below: 100, default: 0 });
  const bytes = size * SIZE_UNITS[sizeUnit];
  const bits = bytes * 8;
  const speedBits = speed * SPEED_UNITS[speedUnit];
  const effective = speedBits * (1 - overhead / 100);
  const T = bits / effective;
  const rows = [...Object.entries(SIZE_UNITS).map(([u, f]) => [u, fmt(bytes / f, 6)]), ["bit", fmt(bits, 6)]];
  return {
    results: [
      { label: "Taille du fichier en bits", value: eng(bits, "bit", 4) },
      { label: "Débit effectif après pertes", value: eng(effective, "bit/s", 4) },
      { label: "Temps de transfert (h:mm:ss)", value: hms(T) },
      { label: "Durée en secondes", value: `${fmt(T, 4)} s` }
    ],
    steps: [
      { text: "Taille du fichier en octets :", tex: `V = ${ntex(size)} \\times ${ntex(SIZE_UNITS[sizeUnit])} = ${ntex(bytes)}\\ \\text{B}` },
      { text: "Conversion des octets en bits (1 B = 8 bit) :", tex: `N = ${ntex(bytes)} \\times 8 = ${ntex(bits)}\\ \\text{bit}` },
      { text: "Débit effectif après déduction des pertes :", tex: `S_{\\text{eff}} = ${ntex(speedBits)} \\times \\left(1 - \\frac{${fmt(overhead, 6)}}{100}\\right) = ${ntex(effective)}\\ \\text{bit/s}` },
      { text: "Temps de transfert :", tex: `t = \\frac{N}{S_{\\text{eff}}} = \\frac{${ntex(bits)}}{${ntex(effective)}} = ${ntex(T, 6)}\\ \\text{s}` }
    ],
    copy: `${hms(T)} (${fmt(T, 4)} s)`,
    blocks: [
      { type: "table", caption: "Conversion de la taille du fichier dans toutes les unités", head: ["Unité", "Valeur équivalente"], rows, ltr: true },
      { type: "note", text: "1 octet = 8 bits. Les débits se mesurent généralement en bit/s, alors que les fichiers se mesurent en octets ; il faut donc convertir entre les deux." },
      { type: "note", text: "Les unités décimales (KB, MB, GB) ont des multiples de 1000, tandis que les unités binaires (KiB, MiB, GiB) ont des multiples de 1024. Par exemple : 1 MB = 1000000 octets et 1 MiB = 1048576 octets." }
    ]
  };
}
