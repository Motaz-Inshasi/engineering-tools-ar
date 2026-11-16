import { readTF, tfTex, polesZeros, logspace } from "../signals/common.js";
import { C, cabs, csub, carg } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Gambar plot Bode (magnitudo dalam desibel dan fasa) untuk fungsi transfer apa pun, dengan frekuensi patah, frekuensi crossover penguatan, frekuensi crossover fasa, serta margin penguatan dan margin fasa.",
  keywords: ["Bode", "Plot Bode", "bode", "bode plot", "margin fasa", "margin penguatan", "phase margin", "gain margin", "respons frekuensi", "desibel"],
  formulas: [
    { label: "Magnitudo dan fasa", tex: "|G(j\\omega)|_{dB} = 20\\log_{10}|G(j\\omega)|,\\qquad \\angle G(j\\omega) = \\angle K + \\sum\\angle(j\\omega - z_i) - \\sum\\angle(j\\omega - p_i)" },
    { label: "Margin", tex: "PM = 180^\\circ + \\angle G(j\\omega_{gc}),\\qquad GM = -|G(j\\omega_{pc})|_{dB}" }
  ],
  inputs: [
    { id: "G", label: "Fungsi transfer G(s)", type: "expr", default: "100/(s(s + 2)(s + 10))" },
    { id: "wmin", label: "Frekuensi terendah (opsional)", unit: "rad/s", type: "number" },
    { id: "wmax", label: "Frekuensi tertinggi (opsional)", unit: "rad/s", type: "number" }
  ],
  example: { values: { G: "100/(s(s + 2)(s + 10))", wmin: "", wmax: "" }, expect: ["PM = 19.91", "GM = 7.604 dB"], note: "Contoh: $G(s) = \\frac{100}{s(s+2)(s+10)}$, sistem tipe 1." },
  invalid: { values: { G: "1/s", wmin: "10", wmax: "1" } },
  related: ["transfer-function", "steady-state-error", "passive-filter", "routh-hurwitz"]
};

export function freqResponse(tf, zeros, poles, w) {
  const lead = tf.num[tf.num.length - 1] / tf.den[tf.den.length - 1];
  const jw = C(0, w);
  let mag = Math.abs(lead), ph = lead < 0 ? Math.PI : 0;
  for (const z of zeros) for (let k = 0; k < z.mult; k++) { const d = csub(jw, z.root); mag *= cabs(d); ph += carg(d); }
  for (const p of poles) for (let k = 0; k < p.mult; k++) { const d = csub(jw, p.root); mag /= cabs(d); ph -= carg(d); }
  return { mag, db: 20 * Math.log10(mag), deg: (ph * 180) / Math.PI };
}

function crossing(ws, vals, target) {
  for (let i = 1; i < ws.length; i++) {
    const a = vals[i - 1] - target, b = vals[i] - target;
    if (a === 0) return ws[i - 1];
    if (a * b < 0) {
      const la = Math.log10(ws[i - 1]), lb = Math.log10(ws[i]);
      return Math.pow(10, la + (lb - la) * (a / (a - b)));
    }
  }
  return null;
}

function refine(f, w0, target) {
  let lo = w0 / 1.05, hi = w0 * 1.05;
  const g = (w) => f(w) - target;
  if (g(lo) * g(hi) > 0) return w0;
  for (let i = 0; i < 80; i++) {
    const m = Math.sqrt(lo * hi);
    if (g(lo) * g(m) <= 0) hi = m; else lo = m;
  }
  return Math.sqrt(lo * hi);
}

export function solve(input) {
  const tf = readTF(input, "G", "Fungsi transfer");
  const { zeros, poles } = polesZeros(tf);
  const corners = [...zeros, ...poles].map((r) => cabs(r.root)).filter((x) => x > 1e-9);
  let wmin = num(input, "wmin", "Frekuensi terendah", { optional: true, positive: true });
  let wmax = num(input, "wmax", "Frekuensi tertinggi", { optional: true, positive: true });
  if (wmin === null) wmin = corners.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...corners))) - 2) : 0.01;
  if (wmax === null) wmax = corners.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...corners))) + 2) : 100;
  if (wmin >= wmax) fail("Frekuensi terendah harus lebih kecil dari frekuensi tertinggi.", "wmax");
  if (wmax / wmin > 1e12) fail("Rentang frekuensi terlalu lebar (lebih dari 12 dekade).", "wmax");
  const ws = logspace(wmin, wmax, 600);
  const fr = ws.map((w) => freqResponse(tf, zeros, poles, w));
  const db = fr.map((r) => r.db), ph = fr.map((r) => r.deg);
  const fdb = (w) => freqResponse(tf, zeros, poles, w).db, fph = (w) => freqResponse(tf, zeros, poles, w).deg;
  let wgc = crossing(ws, db, 0);
  if (wgc) wgc = refine(fdb, wgc, 0);
  const target = ph.some((p) => p <= -180) ? -180 : ph.some((p) => p >= 180) ? 180 : -180;
  let wpc = crossing(ws, ph, target);
  if (wpc) wpc = refine(fph, wpc, target);
  const pm = wgc ? 180 + fph(wgc) : null;
  const gm = wpc ? -fdb(wpc) : null;
  const steps = [
    { text: "Kita substitusikan $s = j\\omega$ ke dalam fungsi transfer:", tex: `G(j\\omega) = \\left.${tfTex(tf)}\\right|_{s = j\\omega}` },
    corners.length ? `Frekuensi patah (besaran kutub dan nol): ${[...new Set(corners.map((c) => fmt(c, 5)))].join("، ")} rad/s. Setiap kutub mengurangi kemiringan sebesar 20 dB/dekade, dan setiap nol menambahkannya sebesar 20 dB/dekade.` : "Tidak ada frekuensi patah yang bukan nol.",
    poles.some((p) => cabs(p.root) < 1e-9) ? "Adanya kutub di titik asal membuat kurva dimulai dengan kemiringan −20 dB/dekade dan fasa −90°." : "Tidak ada kutub di titik asal, sehingga kurva dimulai mendatar pada penguatan statis.",
    "Kita hitung magnitudo dan fasa pada 600 frekuensi yang tersebar secara logaritmik. Fasa diperoleh dengan menjumlahkan sudut faktor-faktornya, sehingga tetap kontinu tanpa lompatan."
  ];
  if (wgc) steps.push({ text: "Pada frekuensi crossover penguatan, magnitudonya 0 dB:", tex: `\\omega_{gc} = ${ntex(wgc, 5)}\\ \\text{rad/s},\\quad PM = 180^\\circ + (${ntex(fph(wgc), 5)}^\\circ) = ${ntex(pm, 5)}^\\circ` });
  else steps.push("Magnitudo tidak melintasi 0 dB pada rentang ini, sehingga margin fasa tidak terdefinisi di sini.");
  if (wpc) steps.push({ text: `Pada frekuensi crossover fasa, fasanya ${target}°:`, tex: `\\omega_{pc} = ${ntex(wpc, 5)}\\ \\text{rad/s},\\quad GM = ${ntex(gm, 5)}\\ \\text{dB}` });
  else steps.push("Fasa tidak mencapai −180° pada rentang ini, sehingga margin penguatan tak hingga.");
  steps.push("Margin hanya menunjukkan kestabilan loop tertutup jika loop terbuka stabil dan tidak memiliki nol di setengah bidang kanan.");
  const verdict = pm === null ? "—" : pm > 0 && (gm === null || gm > 0) ? "Loop tertutup stabil (kedua margin positif)" : "Loop tertutup tidak stabil (margin negatif)";
  return {
    results: [
      { label: "Frekuensi crossover penguatan ωgc", value: wgc ?? "Tidak ditemukan", unit: wgc ? "rad/s" : "", sig: 5 },
      { label: "Margin fasa PM", value: pm ?? "Tidak terdefinisi", unit: pm !== null ? "°" : "", sig: 4, text: pm !== null ? `PM = ${fmt(pm, 4)}°` : undefined },
      { label: "Frekuensi crossover fasa ωpc", value: wpc ?? "Tidak ditemukan", unit: wpc ? "rad/s" : "", sig: 5 },
      { label: "Margin penguatan GM", value: gm ?? "Tak hingga", unit: gm !== null ? "dB" : "", sig: 4 },
      { label: "Putusan", value: verdict }
    ],
    blocks: [
      { type: "plot", title: "Magnitudo (dB)", logX: true, xLabel: "ω (rad/s)", yLabel: "|G| (dB)", series: [{ name: "|G(jω)|", points: ws.map((w, i) => [w, db[i]]) }], hlines: [{ y: 0 }], vlines: wgc ? [{ x: wgc }] : [] },
      { type: "plot", title: "Fasa (derajat)", logX: true, xLabel: "ω (rad/s)", yLabel: "∠G (°)", series: [{ name: "∠G(jω)", points: ws.map((w, i) => [w, ph[i]]), color: "var(--plot-3)" }], hlines: [{ y: -180 }], vlines: wpc ? [{ x: wpc }] : [] }
    ],
    steps,
    copy: `PM = ${pm !== null ? fmt(pm, 4) + "°" : "n/a"} at ${wgc ? fmt(wgc, 5) : "-"} rad/s; GM = ${gm !== null ? fmt(gm, 4) + " dB" : "inf"} at ${wpc ? fmt(wpc, 5) : "-"} rad/s`
  };
}
