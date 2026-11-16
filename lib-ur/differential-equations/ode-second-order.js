import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "حل المعادلة التفاضلية الخطية من الرتبة الثانية بمعاملات ثابتة ay″ + by′ + cy = g(t) خطوة بخطوة: المعادلة المميزة والحل المتجانس والحل الخاص بطريقة المعاملات غير المعينة، ثم تطبيق الشروط الابتدائية والرسم.",
  keywords: ["معادلة تفاضلية من الرتبة الثانية", "المعادلة المميزة", "second order ode", "constant coefficients", "المعاملات غير المعينة", "الحل المتجانس", "الحل الخاص", "الاهتزازات", "التخميد", "الرنين", "y''"],
  formulas: [
    { label: "المعادلة والمعادلة المميزة", tex: "a y'' + b y' + c y = g(t),\\qquad a r^2 + b r + c = 0" },
    { label: "الحل العام", tex: "y = y_h + y_p" }
  ],
  inputs: [
    { id: "a", label: "a (معامل y″)", type: "number", default: "1" },
    { id: "b", label: "b (معامل y′)", type: "number", default: "2" },
    { id: "c", label: "c (معامل y)", type: "number", default: "5" },
    { id: "g", label: "الطرف الأيمن g(t)", type: "select", default: "zero", options: [["zero", "صفر (معادلة متجانسة)"], ["const", "ثابت K"], ["exp", "K·e^(st)"], ["cos", "K·cos(ωt)"], ["sin", "K·sin(ωt)"]] },
    { id: "K", label: "K", type: "number", default: "1", when: { g: ["const", "exp", "cos", "sin"] } },
    { id: "s", label: "s", type: "number", default: "1", when: { g: ["exp"] } },
    { id: "w", label: "ω", unit: "rad/s", type: "number", default: "1", when: { g: ["cos", "sin"] } },
    { id: "y0", label: "y(0) (اختياري)", type: "number", default: "1" },
    { id: "v0", label: "y′(0) (اختياري)", type: "number", default: "0" }
  ],
  example: { values: { a: "1", b: "2", c: "5", g: "zero", K: "", s: "", w: "", y0: "1", v0: "0" }, expect: ["r = -1 ± 2i", "تخميد ناقص"], note: "مثال: y″ + 2y′ + 5y = 0 مع y(0) = 1 و y′(0) = 0." },
  invalid: { values: { a: "0", b: "2", c: "5", g: "zero", y0: "", v0: "" } },
  related: ["ode-first-order", "ode-numerical", "harmonic-motion", "rlc-circuit", "step-response", "quadratic"]
};

const T = (x) => ntex(x, 5);
const signed = (x, s) => (x < 0 ? ` - ${T(-x)}${s}` : ` + ${T(x)}${s}`);
const near = (x, v) => Math.abs(x - v) < 1e-10;
const E = (r) => (near(r, 0) ? "" : `e^{${near(r, 1) ? "" : near(r, -1) ? "-" : T(r)}t}`);
const W = (w) => (near(w, 1) ? "t" : `${T(w)}t`);

function lin(terms) {
  const parts = [];
  for (const [c, body] of terms) {
    if (typeof c === "string") { parts.push(body ? `${c}\\,${body}` : c); continue; }
    if (near(c, 0)) continue;
    const v = Math.abs(c), sgn = c < 0 ? "-" : "";
    parts.push(`${sgn}${near(v, 1) ? (body || "1") : body ? `${T(v)}\\,${body}` : T(v)}`);
  }
  return parts.length ? parts.join(" + ").replace(/\+ -/g, "- ") : "0";
}

const scaled = (prefix, inner) => (prefix ? (inner === "0" ? "0" : `${prefix}\\left(${inner}\\right)`) : inner);

function homogeneous(a, b, c) {
  const D = b * b - 4 * a * c;
  const tol = 1e-12 * Math.max(b * b, Math.abs(4 * a * c), 1e-300);
  if (Math.abs(D) <= tol) {
    const r = -b / (2 * a);
    return { kind: "repeated", D, r, f: [(t) => Math.exp(r * t), (t) => t * Math.exp(r * t)], df: [(t) => r * Math.exp(r * t), (t) => (1 + r * t) * Math.exp(r * t)], tex: (C1, C2) => (typeof C1 === "string" ? `(C_1 + C_2\\,t)\\,${E(r) || "1"}` : lin([[C1, E(r)], [C2, E(r) ? `t\\,${E(r)}` : "t"]])), rootText: `r = ${fmt(r, 5)} (جذر مكرر)` };
  }
  if (D > 0) {
    const q = -0.5 * (b + Math.sign(b || 1) * Math.sqrt(D));
    let r1 = q / a, r2 = c / q;
    if (r1 < r2) [r1, r2] = [r2, r1];
    return { kind: "real", D, r1, r2, f: [(t) => Math.exp(r1 * t), (t) => Math.exp(r2 * t)], df: [(t) => r1 * Math.exp(r1 * t), (t) => r2 * Math.exp(r2 * t)], tex: (C1, C2) => lin([[C1, E(r1)], [C2, E(r2)]]), rootText: `r₁ = ${fmt(r1, 5)}، r₂ = ${fmt(r2, 5)}` };
  }
  const al = -b / (2 * a), be = Math.sqrt(-D) / (2 * Math.abs(a));
  return {
    kind: "complex", D, al, be,
    f: [(t) => Math.exp(al * t) * Math.cos(be * t), (t) => Math.exp(al * t) * Math.sin(be * t)],
    df: [(t) => Math.exp(al * t) * (al * Math.cos(be * t) - be * Math.sin(be * t)), (t) => Math.exp(al * t) * (al * Math.sin(be * t) + be * Math.cos(be * t))],
    tex: (C1, C2) => scaled(E(al), lin([[C1, `\\cos ${W(be)}`], [C2, `\\sin ${W(be)}`]])),
    rootText: `r = ${fmt(al, 5)} ± ${fmt(be, 5)}i`
  };
}

function particular(a, b, c, g, K, s, w, steps) {
  if (g === "zero") return { f: () => 0, df: () => 0, tex: "0" };
  if (g === "const") {
    if (c !== 0) { const A = K / c; steps.push({ text: "نجرّب حلاً خاصاً ثابتاً y_p = A:", tex: `cA = K \\Rightarrow A = \\frac{${T(K)}}{${T(c)}} = ${T(A)}` }); return { f: () => A, df: () => 0, tex: lin([[A, ""]]) }; }
    if (b !== 0) { const A = K / b; steps.push({ text: "c = 0، فنجرّب y_p = At:", tex: `bA = K \\Rightarrow A = ${T(A)}` }); return { f: (t) => A * t, df: () => A, tex: lin([[A, "t"]]) }; }
    const A = K / (2 * a); steps.push({ text: "b = c = 0، فنجرّب y_p = At²:", tex: `2aA = K \\Rightarrow A = ${T(A)}` }); return { f: (t) => A * t * t, df: (t) => 2 * A * t, tex: lin([[A, "t^2"]]) };
  }
  if (g === "exp") {
    const P = a * s * s + b * s + c, dP = 2 * a * s + b;
    if (Math.abs(P) > 1e-12) { const A = K / P; steps.push({ text: "نجرّب y_p = A e^{st}:", tex: `A(as^2 + bs + c) = K \\Rightarrow A = \\frac{${T(K)}}{${T(P)}} = ${T(A)}` }); return { f: (t) => A * Math.exp(s * t), df: (t) => A * s * Math.exp(s * t), tex: lin([[A, E(s)]]) }; }
    if (Math.abs(dP) > 1e-12) { const A = K / dP; steps.push({ text: "s جذر للمعادلة المميزة (رنين)، فنضرب في t: y_p = A t e^{st}:", tex: `A(2as + b) = K \\Rightarrow A = ${T(A)}` }); return { f: (t) => A * t * Math.exp(s * t), df: (t) => A * (1 + s * t) * Math.exp(s * t), tex: lin([[A, E(s) ? `t\\,${E(s)}` : "t"]]) }; }
    const A = K / (2 * a); steps.push({ text: "s جذر مكرر، فنضرب في t²: y_p = A t² e^{st}:", tex: `2aA = K \\Rightarrow A = ${T(A)}` }); return { f: (t) => A * t * t * Math.exp(s * t), df: (t) => A * (2 * t + s * t * t) * Math.exp(s * t), tex: lin([[A, E(s) ? `t^2 ${E(s)}` : "t^2"]]) };
  }
  const P = c - a * w * w, Q = b * w;
  const isCos = g === "cos";
  if (Math.abs(P) < 1e-12 && Math.abs(Q) < 1e-12) {
    const A = K / (2 * a * w);
    steps.push({ text: "رنين تام: ω تساوي التردد الطبيعي ولا يوجد تخميد، فيكبر الحل مع الزمن:", tex: isCos ? `y_p = \\frac{K}{2a\\omega}\\,t\\sin\\omega t = ${T(A)}\\,t\\sin ${T(w)}t` : `y_p = -\\frac{K}{2a\\omega}\\,t\\cos\\omega t = ${T(-A)}\\,t\\cos ${T(w)}t` });
    return isCos ? { f: (t) => A * t * Math.sin(w * t), df: (t) => A * (Math.sin(w * t) + w * t * Math.cos(w * t)), tex: lin([[A, `t\\sin ${W(w)}`]]), resonance: true } : { f: (t) => -A * t * Math.cos(w * t), df: (t) => -A * (Math.cos(w * t) - w * t * Math.sin(w * t)), tex: lin([[-A, `t\\cos ${W(w)}`]]), resonance: true };
  }
  const den = P * P + Q * Q;
  const [A, B] = isCos ? [(K * P) / den, (K * Q) / den] : [(-K * Q) / den, (K * P) / den];
  steps.push({ text: "نجرّب y_p = A cos ωt + B sin ωt ونعوّض:", tex: `\\begin{cases}(c - a\\omega^2)A + b\\omega B = ${isCos ? T(K) : 0}\\\\ -b\\omega A + (c - a\\omega^2)B = ${isCos ? 0 : T(K)}\\end{cases} \\Rightarrow A = ${T(A)},\\ B = ${T(B)}` });
  return { f: (t) => A * Math.cos(w * t) + B * Math.sin(w * t), df: (t) => w * (-A * Math.sin(w * t) + B * Math.cos(w * t)), tex: lin([[A, `\\cos ${W(w)}`], [B, `\\sin ${W(w)}`]]), amp: Math.sqrt(A * A + B * B) };
}

export function solve(input) {
  const a = num(input, "a", "a", { nonZero: true });
  const b = num(input, "b", "b"), c = num(input, "c", "c");
  const g = choice(input, "g", "الطرف الأيمن", ["zero", "const", "exp", "cos", "sin"], "zero");
  const K = g === "zero" ? 0 : num(input, "K", "K");
  const s = g === "exp" ? num(input, "s", "s") : 0;
  const w = g === "cos" || g === "sin" ? num(input, "w", "ω", { positive: true }) : 0;
  const hasIC = !isBlank(input.y0) || !isBlank(input.v0);
  if (hasIC && (isBlank(input.y0) || isBlank(input.v0))) fail("أدخل الشرطين الابتدائيين معاً، أو اتركهما فارغين للحل العام.", isBlank(input.y0) ? "y0" : "v0");
  const steps = [{ text: "المعادلة المميزة:", tex: `${lin([[a, "r^2"], [b, "r"], [c, ""]])} = 0,\\quad \\Delta = b^2 - 4ac = ${T(b * b - 4 * a * c)}` }];
  const H = homogeneous(a, b, c);
  steps.push({ text: H.kind === "real" ? "Δ > 0: جذران حقيقيان مختلفان." : H.kind === "repeated" ? "Δ = 0: جذر حقيقي مكرر." : "Δ < 0: جذران مركبان مترافقان.", tex: `${H.rootText.replace(/±/g, "\\pm").replace(/،/g, ",\\ ").replace("(جذر مكرر)", "").replace(/r₁/g, "r_1").replace(/r₂/g, "r_2")}` });
  steps.push({ text: "الحل المتجانس:", tex: `y_h = ${H.tex("C_1", "C_2")}` });
  const Pp = particular(a, b, c, g, K, s, w, steps);
  const results = [{ label: "جذور المعادلة المميزة", value: H.rootText, text: H.rootText }];
  let damp = "";
  if (a * c > 0) {
    const wn = Math.sqrt(c / a), z = b / (2 * Math.sqrt(a * c));
    damp = z < 0 ? "غير مستقر (تخميد سالب)" : z === 0 ? "بلا تخميد (اهتزاز دائم)" : z < 1 - 1e-9 ? "تخميد ناقص (اهتزاز متلاشٍ)" : z <= 1 + 1e-9 ? "تخميد حرج" : "تخميد زائد";
    results.push({ label: "التردد الطبيعي ωₙ / نسبة التخميد ζ", value: `${fmt(wn, 5)} rad/s / ${fmt(z, 4)}` }, { label: "نوع الاستجابة", value: damp });
  } else results.push({ label: "نوع الاستجابة", value: "جذر موجب أو صفري، فالحل المتجانس لا يتلاشى" });
  const general = `y = ${H.tex("C_1", "C_2")}${g === "zero" ? "" : ` + ${Pp.tex}`}`.replace(/\+ -/g, "- ");
  results.push({ label: "الحل العام", value: "", tex: general });
  let copy = `${H.rootText}${damp ? `، ${damp}` : ""}`;
  let yf = null;
  if (hasIC) {
    const y0 = num(input, "y0", "y(0)"), v0 = num(input, "v0", "y′(0)");
    const [f1, f2] = H.f, [d1, d2] = H.df;
    const m11 = f1(0), m12 = f2(0), m21 = d1(0), m22 = d2(0);
    const r1 = y0 - Pp.f(0), r2 = v0 - Pp.df(0);
    const det = m11 * m22 - m12 * m21;
    const C1 = (r1 * m22 - m12 * r2) / det, C2 = (m11 * r2 - m21 * r1) / det;
    steps.push({ text: "نطبّق الشرطين الابتدائيين:", tex: `\\begin{cases}${T(m11)}C_1${signed(m12, "C_2")} = ${T(y0)}${g === "zero" ? "" : ` - (${T(Pp.f(0))})`}\\\\ ${T(m21)}C_1${signed(m22, "C_2")} = ${T(v0)}${g === "zero" ? "" : ` - (${T(Pp.df(0))})`}\\end{cases} \\Rightarrow C_1 = ${T(C1)},\\ C_2 = ${T(C2)}` });
    const hp = H.tex(C1, C2);
    const sol = `y(t) = ${hp === "0" ? Pp.tex : g === "zero" || Pp.tex === "0" ? hp : `${hp} + ${Pp.tex}`}`.replace(/\+ -/g, "- ");
    steps.push({ text: "الحل الخاص بالشروط الابتدائية:", tex: sol });
    results.push({ label: "الحل مع الشروط الابتدائية", value: "", tex: sol });
    yf = (t) => C1 * f1(t) + C2 * f2(t) + Pp.f(t);
    copy += ` | C1 = ${fmt(C1, 5)}, C2 = ${fmt(C2, 5)}`;
  } else steps.push("لم تُدخل شروطاً ابتدائية، فيبقى الثابتان C₁ و C₂ اختياريين.");
  if (Pp.amp !== undefined) results.push({ label: "سعة الاستجابة المستقرة", value: fmt(Pp.amp, 5) });
  if (Pp.resonance) results.push({ label: "تنبيه", value: "رنين: السعة تزداد خطياً مع الزمن" });
  const blocks = [];
  if (yf) {
    const rates = H.kind === "complex" ? [Math.abs(H.al), H.be] : H.kind === "real" ? [Math.abs(H.r1), Math.abs(H.r2)] : [Math.abs(H.r)];
    const slow = Math.min(...rates.filter((x) => x > 1e-9), w || Infinity, Math.abs(s) || Infinity);
    const tEnd = isFinite(slow) ? Math.min(60, Math.max(2, (H.kind === "complex" && Math.abs(H.al) < 1e-9 ? 4 * 2 * Math.PI / H.be : 6 / slow))) : 10;
    const pts = sampleFunction(yf, 0, tEnd, 400);
    blocks.push({ type: "plot", title: "الحل y(t)", xLabel: "t", yLabel: "y", series: [{ name: "y(t)", points: pts }], includeZero: true });
  }
  return { results, steps, blocks, copy };
}
