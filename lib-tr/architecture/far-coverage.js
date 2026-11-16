import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "Arsa için kapsama oranı, emsal (FAR) ve açık alanı hesaplayın; yapılaşma koşullarını denetleyin ve izin verilen en büyük oturum alanı, toplam inşaat alanı ve kat sayısını bulun.",
  keywords: ["kapsama oranı", "emsal", "FAR", "coverage", "yapılaşma koşulları", "açık alan", "kat"],
  formulas: [
    { label: "kapsama oranı", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "emsal", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "Toplam inşaat alanı", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "Arsa alanı", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "Zemin kat alanı (oturum)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "Toplam alanın hesaplama yöntemi", type: "select", default: "floors", options: [["floors", "Kat sayısı"], ["area", "Toplam alan"]] },
    { id: "floors", label: "Kat sayısı", type: "number", default: "4", when: { mode: ["floors"] }, help: "Tüm katların oturum alanıyla aynı olduğu varsayılır." },
    { id: "totalArea", label: "Toplam inşaat alanı", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "İzin verilen kapsama oranı", unit: "%", type: "number", help: "İsteğe bağlı." },
    { id: "maxFar", label: "İzin verilen emsal", type: "number", help: "İsteğe bağlı." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "Örnek: 500 m² arsa, 300 m² oturum alanı ve 4 kat." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "Arsa alanı", { positive: true });
  const F = num(input, "footprint", "Zemin kat alanı", { positive: true });
  if (F > P) fail("Oturum alanı arsa alanını aşamaz.", "footprint");
  const mode = choice(input, "mode", "Hesaplama yöntemi", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "Kat sayısı", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "Toplam inşaat alanı", { positive: true });
  }
  const maxCov = num(input, "maxCov", "İzin verilen kapsama oranı", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "İzin verilen emsal", { positive: true, optional: true });
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
  if (!covOk) issues.push(`Kapsama sınırı ${fmt(cov - maxCov, 4)}% aşıyor`);
  if (!farOk) issues.push(`Emsal sınırı ${fmt(far - maxFar, 4)} kadar aşıyor`);
  const verdict = issues.length === 0 ? "Yapılaşma koşullarına uygun" : `Uygun değil: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "Sınır yok" : ok ? "Uygun" : "Uygun değil");
  const steps = [
    { text: "Kapsama oranı:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "Toplam inşaat alanı:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "Emsal:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "Açık alan:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["kapsama oranı", `${fmt(cov, 4)}%`, maxCov === null ? "Sınır yok" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["Emsal (FAR)", fmt(far, 4), maxFar === null ? "Sınır yok" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "kapsama oranı", value: `${fmt(cov, 4)}%`, text: `Kapsama ${fmt(cov, 4)}%` },
    { label: "Toplam inşaat alanı", value: `${fmt(total, 6)} m²` },
    { label: "Emsal (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "Açık alan", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "İzin verilen en büyük oturum alanı", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "İzin verilen en büyük toplam alan", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "FAR'a göre en büyük kat sayısı", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "Karar", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "Koşullarla karşılaştırma", head: ["Gösterge", "Değer", "İzin verilen sınır", "Karar"], rows }],
    copy: `Kapsama ${fmt(cov, 4)}%, FAR = ${fmt(far, 4)}, açık alan ${fmt(open, 4)} m², karar: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
