import { readTF, tfTex, polesZeros, logspace } from "../signals/common.js";
import { C, cabs, csub, carg } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "رسم نمودار بود (اندازه بر حسب دسی‌بل و فاز) برای هر تابع انتقال، همراه با فرکانس‌های شکست، فرکانس عبور بهره، فرکانس عبور فاز، و حاشیه‌های بهره و فاز.",
  keywords: ["بود", "نمودار بود", "bode", "bode plot", "حاشیه فاز", "حاشیه بهره", "phase margin", "gain margin", "پاسخ فرکانسی", "دسی‌بل"],
  formulas: [
    { label: "اندازه و فاز", tex: "|G(j\\omega)|_{dB} = 20\\log_{10}|G(j\\omega)|,\\qquad \\angle G(j\\omega) = \\angle K + \\sum\\angle(j\\omega - z_i) - \\sum\\angle(j\\omega - p_i)" },
    { label: "حاشیه‌ها", tex: "PM = 180^\\circ + \\angle G(j\\omega_{gc}),\\qquad GM = -|G(j\\omega_{pc})|_{dB}" }
  ],
  inputs: [
    { id: "G", label: "تابع انتقال G(s)", type: "expr", default: "100/(s(s + 2)(s + 10))" },
    { id: "wmin", label: "کمترین فرکانس (اختیاری)", unit: "rad/s", type: "number" },
    { id: "wmax", label: "بیشترین فرکانس (اختیاری)", unit: "rad/s", type: "number" }
  ],
  example: { values: { G: "100/(s(s + 2)(s + 10))", wmin: "", wmax: "" }, expect: ["PM = 19.91", "GM = 7.604 dB"], note: "مثال: $G(s) = \\frac{100}{s(s+2)(s+10)}$، سیستم نوع 1." },
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
  const tf = readTF(input, "G", "تابع انتقال");
  const { zeros, poles } = polesZeros(tf);
  const corners = [...zeros, ...poles].map((r) => cabs(r.root)).filter((x) => x > 1e-9);
  let wmin = num(input, "wmin", "کمترین فرکانس", { optional: true, positive: true });
  let wmax = num(input, "wmax", "بیشترین فرکانس", { optional: true, positive: true });
  if (wmin === null) wmin = corners.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...corners))) - 2) : 0.01;
  if (wmax === null) wmax = corners.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...corners))) + 2) : 100;
  if (wmin >= wmax) fail("کمترین فرکانس باید از بیشترین فرکانس کوچک‌تر باشد.", "wmax");
  if (wmax / wmin > 1e12) fail("محدوده فرکانس خیلی پهن است (بیش از 12 دهه).", "wmax");
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
    { text: "در تابع انتقال $s = j\\omega$ را جایگذاری می‌کنیم:", tex: `G(j\\omega) = \\left.${tfTex(tf)}\\right|_{s = j\\omega}` },
    corners.length ? `فرکانس‌های شکست (اندازه قطب‌ها و صفرها): ${[...new Set(corners.map((c) => fmt(c, 5)))].join("، ")} rad/s. هر قطب شیب را 20 dB/دهه کم می‌کند و هر صفر آن را 20 dB/دهه زیاد می‌کند.` : "فرکانس شکست غیرصفری وجود ندارد.",
    poles.some((p) => cabs(p.root) < 1e-9) ? "وجود قطب در مبدأ منحنی را با شیب −20 dB/دهه و فاز −90° شروع می‌کند." : "قطب در مبدأ وجود ندارد، پس منحنی از بهره ایستا به صورت افقی شروع می‌شود.",
    "اندازه و فاز را در 600 فرکانس با فاصله لگاریتمی محاسبه کردیم؛ فاز با جمع زاویه‌های عامل‌ها به دست می‌آید، پس بدون جهش و پیوسته می‌ماند."
  ];
  if (wgc) steps.push({ text: "در فرکانس عبور بهره اندازه برابر 0 dB است:", tex: `\\omega_{gc} = ${ntex(wgc, 5)}\\ \\text{rad/s},\\quad PM = 180^\\circ + (${ntex(fph(wgc), 5)}^\\circ) = ${ntex(pm, 5)}^\\circ` });
  else steps.push("اندازه در این محدوده از 0 dB عبور نمی‌کند، پس حاشیه فاز در اینجا تعریف‌نشده است.");
  if (wpc) steps.push({ text: `در فرکانس عبور فاز، فاز برابر ${target}° است:`, tex: `\\omega_{pc} = ${ntex(wpc, 5)}\\ \\text{rad/s},\\quad GM = ${ntex(gm, 5)}\\ \\text{dB}` });
  else steps.push("فاز در این محدوده به −180° نمی‌رسد، پس حاشیه بهره بی‌نهایت است.");
  steps.push("حاشیه‌ها تنها در صورتی پایداری حلقه بسته را نشان می‌دهند که حلقه باز پایدار باشد و صفری در نیم‌صفحه راست نداشته باشد.");
  const verdict = pm === null ? "—" : pm > 0 && (gm === null || gm > 0) ? "حلقه بسته پایدار است (هر دو حاشیه مثبت)" : "حلقه بسته ناپایدار است (حاشیه منفی)";
  return {
    results: [
      { label: "فرکانس عبور بهره ωgc", value: wgc ?? "یافت نشد", unit: wgc ? "rad/s" : "", sig: 5 },
      { label: "حاشیه فاز PM", value: pm ?? "تعریف‌نشده", unit: pm !== null ? "°" : "", sig: 4, text: pm !== null ? `PM = ${fmt(pm, 4)}°` : undefined },
      { label: "فرکانس عبور فاز ωpc", value: wpc ?? "یافت نشد", unit: wpc ? "rad/s" : "", sig: 5 },
      { label: "حاشیه بهره GM", value: gm ?? "بی‌نهایت", unit: gm !== null ? "dB" : "", sig: 4 },
      { label: "حکم", value: verdict }
    ],
    blocks: [
      { type: "plot", title: "اندازه (dB)", logX: true, xLabel: "ω (rad/s)", yLabel: "|G| (dB)", series: [{ name: "|G(jω)|", points: ws.map((w, i) => [w, db[i]]) }], hlines: [{ y: 0 }], vlines: wgc ? [{ x: wgc }] : [] },
      { type: "plot", title: "فاز (درجه)", logX: true, xLabel: "ω (rad/s)", yLabel: "∠G (°)", series: [{ name: "∠G(jω)", points: ws.map((w, i) => [w, ph[i]]), color: "var(--plot-3)" }], hlines: [{ y: -180 }], vlines: wpc ? [{ x: wpc }] : [] }
    ],
    steps,
    copy: `PM = ${pm !== null ? fmt(pm, 4) + "°" : "n/a"} at ${wgc ? fmt(wgc, 5) : "-"} rad/s; GM = ${gm !== null ? fmt(gm, 4) + " dB" : "inf"} at ${wpc ? fmt(wpc, 5) : "-"} rad/s`
  };
}
