import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Rancang tangga antara dua lantai: hitung jumlah anak tangga, tinggi optrede, dan lebar antrede berdasarkan aturan Blondel, lalu periksa kriterianya dan panjang bentangan horizontal yang tersedia.",
  keywords: ["tangga", "aturan Blondel", "tinggi optrede", "lebar antrede", "stair", "blondel", "sudut tangga"],
  formulas: [
    { label: "Jumlah anak tangga", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "Tinggi dan lebar anak tangga", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "Bentangan horizontal dan sudut tangga", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "Tinggi antar lantai H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "Tinggi optrede yang diinginkan R", unit: "cm", type: "number", default: "17", help: "Perkiraan; optrede disesuaikan agar tinggi terbagi tepat." },
    { id: "blondel", label: "Target Blondel 2R + G", unit: "cm", type: "number", default: "63", help: "Nilai ideal antara 60 dan 64 cm." },
    { id: "avail", label: "Panjang horizontal yang tersedia", unit: "cm", type: "number", help: "Opsional: untuk memeriksa apakah tangga muat di ruang." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "Contoh: tinggi 300 cm antara dua lantai." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "Tinggi antar lantai", { positive: true });
  const Rp = num(input, "riser", "Tinggi optrede yang diinginkan", { positive: true, max: 30 });
  const B = num(input, "blondel", "Target Blondel", { positive: true, max: 100 });
  const avail = num(input, "avail", "Panjang horizontal yang tersedia", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("Tinggi terlalu kecil untuk optrede yang diinginkan; tangga memerlukan minimal dua anak tangga.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("Target Blondel terlalu kecil untuk tinggi ini; naikkan target atau kurangi jumlah anak tangga.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "Tinggi optrede R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "Lebar antrede G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "Kriteria Blondel 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "sudut tangga", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "Bentangan horizontal dibandingkan dengan yang tersedia", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "Sesuai dan memenuhi kriteria" : "Perlu penyesuaian";
  const steps = [
    { text: "Jumlah anak tangga dibulatkan dari tinggi yang diinginkan:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "Tinggi optrede aktual:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "Lebar antrede dari aturan Blondel:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "Bentangan horizontal tangga:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "Sudut tangga:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "Panjang balok penopang miring:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "Pemeriksaan kriteria", head: ["Pemeriksaan", "Nilai", "Kriteria", "Putusan"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "Sesuai" : "Tidak sesuai"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "Sebagian kriteria tidak terpenuhi; ubah tinggi optrede yang diinginkan, target Blondel, atau panjang yang tersedia." });
  return {
    results: [
      { label: "Jumlah optrede (tinggi anak tangga) n", value: `${n}` },
      { label: "Jumlah antrede (permukaan anak tangga)", value: `${treads}` },
      { label: "Tinggi optrede R", value: `${fmt(R, 4)} cm` },
      { label: "Lebar antrede G", value: `${fmt(G, 4)} cm` },
      { label: "Bentangan horizontal total", value: `${fmt(run, 4)} cm` },
      { label: "sudut tangga", value: `${fmt(angle, 3)}°` },
      { label: "Panjang balok penopang miring", value: `${fmt(stringer, 4)} cm` },
      { label: "Putusan", value: verdict }
    ],
    steps,
    blocks,
    copy: `Jumlah anak tangga: ${n}, R = ${fmt(R, 4)} cm, G = ${fmt(G, 4)} cm, bentangan horizontal = ${fmt(run, 4)} cm, sudut = ${fmt(angle, 3)}°, putusan: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
