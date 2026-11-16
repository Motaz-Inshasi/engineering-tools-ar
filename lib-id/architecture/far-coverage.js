import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "Hitung rasio cakupan, koefisien pemanfaatan lahan (FAR), dan area terbuka sebidang tanah, periksa persyaratan bangunan, lalu hitung denah maksimum, luas total maksimum, dan jumlah lantai maksimum yang diizinkan.",
  keywords: ["rasio cakupan", "koefisien pemanfaatan lahan", "FAR", "coverage", "persyaratan bangunan", "area terbuka", "lantai"],
  formulas: [
    { label: "rasio cakupan", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "koefisien pemanfaatan lahan", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "Luas total bangunan", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "Luas lahan", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "Luas lantai dasar (denah)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "Metode menghitung luas total", type: "select", default: "floors", options: [["floors", "Jumlah lantai"], ["area", "Luas total"]] },
    { id: "floors", label: "Jumlah lantai", type: "number", default: "4", when: { mode: ["floors"] }, help: "Diasumsikan semua lantai memiliki luas yang sama dengan denah." },
    { id: "totalArea", label: "Luas total bangunan", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "Rasio cakupan yang diizinkan", unit: "%", type: "number", help: "Opsional." },
    { id: "maxFar", label: "FAR yang diizinkan", type: "number", help: "Opsional." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "Contoh: lahan 500 m², denah 300 m², dan 4 lantai." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "Luas lahan", { positive: true });
  const F = num(input, "footprint", "Luas lantai dasar", { positive: true });
  if (F > P) fail("Luas denah tidak boleh melebihi luas lahan.", "footprint");
  const mode = choice(input, "mode", "Metode perhitungan", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "Jumlah lantai", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "Luas total bangunan", { positive: true });
  }
  const maxCov = num(input, "maxCov", "Rasio cakupan yang diizinkan", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "FAR yang diizinkan", { positive: true, optional: true });
  const cov = (F * 100) / P;
  const far = total / P;
  const open = P - F;
  const openPct = (open * 100) / P;
  const covOk = maxCov === null || cov <= maxCov + EPS;
  const farOk = maxFar === null || far <= maxFar + EPS;
  const maxFootprint = maxCov === null ? null : (maxCov / 100) * P;
  const maxTotal = maxFar === null ? null : maxFar * P;
  const maxFloors = maxTotal === null ? null : Math.floor(maxTotal / F + EPS);
  const issues = [];
  if (!covOk) issues.push(`Cakupan melebihi batas sebesar ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`FAR melebihi batas sebesar ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "Sesuai dengan persyaratan" : `Tidak sesuai: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "Tanpa batas" : ok ? "Sesuai" : "Tidak sesuai");
  const steps = [
    { text: "Rasio cakupan:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "Luas total bangunan:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "Koefisien pemanfaatan lahan:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "Area terbuka:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["rasio cakupan", `${fmt(cov, 4)}%`, maxCov === null ? "Tanpa batas" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["Koefisien pemanfaatan (FAR)", fmt(far, 4), maxFar === null ? "Tanpa batas" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "rasio cakupan", value: `${fmt(cov, 4)}%`, text: `Cakupan ${fmt(cov, 4)}%` },
    { label: "Luas total bangunan", value: `${fmt(total, 6)} m²` },
    { label: "Koefisien pemanfaatan (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "Area terbuka", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "Denah maksimum yang diizinkan", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "Luas total maksimum yang diizinkan", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "Jumlah lantai maksimum menurut FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "Putusan", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "Perbandingan dengan persyaratan", head: ["Indikator", "Nilai", "Batas yang diizinkan", "Putusan"], rows }],
    copy: `Cakupan ${fmt(cov, 4)}%, FAR = ${fmt(far, 4)}, area terbuka ${fmt(open, 4)} m², putusan: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
