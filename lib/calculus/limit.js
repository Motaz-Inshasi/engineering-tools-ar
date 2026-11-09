import { simplify, diff } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, toFraction, nice, niceTex } from "../core/format.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "احسب نهاية دالة عند نقطة أو عند اللانهاية: بالتعويض المباشر، أو بقاعدة لوبيتال للصيغ غير المحددة، أو بتقدير عددي من الجهتين مع جدول اقتراب.",
  keywords: ["نهاية", "نهايات", "limit", "لوبيتال", "صيغة غير محددة", "نهاية من اليمين", "نهاية من اليسار"],
  formulas: [
    { label: "قاعدة لوبيتال للصيغة 0/0 أو ∞/∞", tex: "\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f'(x)}{g'(x)}" },
    { label: "وجود النهاية", tex: "\\lim_{x\\to a} f(x) = L \\iff \\lim_{x\\to a^-} f(x) = \\lim_{x\\to a^+} f(x) = L" }
  ],
  inputs: [
    { id: "f", label: "الدالة", type: "expr", placeholder: "sin(x)/x" },
    { id: "v", label: "المتغير", type: "text", default: "x" },
    { id: "a", label: "النقطة التي يقترب منها المتغير", type: "number", default: "0", help: "اكتب inf للانهاية الموجبة أو -inf للسالبة." },
    { id: "dir", label: "الاتجاه", type: "select", default: "both", options: [["both", "من الجهتين"], ["left", "من اليسار (−)"], ["right", "من اليمين (+)"]] }
  ],
  example: { values: { f: "sin(x)/x", v: "x", a: "0", dir: "both" }, expect: ["= 1"], note: "مثال: $\\lim_{x\\to 0} \\frac{\\sin x}{x}$ صيغة $\\frac{0}{0}$ تُحل بلوبيتال." },
  invalid: { values: { f: "", a: "0" } },
  related: ["derivative", "taylor-series", "function-plotter"]
};

function snap(x) {
  if (!isFinite(x)) return x;
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return r;
  const fr = toFraction(x, 1000, 1e-9);
  return fr ? fr[0] / fr[1] : x;
}

function numericSide(F, a, side) {
  const vals = [];
  for (let k = 1; k <= 8; k++) {
    const x = isFinite(a) ? a + side * Math.pow(10, -k) : side * Math.pow(10, k + 1);
    vals.push([x, F(x)]);
  }
  const ys = vals.map((p) => p[1]);
  const finite = ys.filter((y) => isFinite(y));
  if (finite.length < 4) {
    const last = ys[ys.length - 1];
    if (last === Infinity || last === -Infinity) return { value: last, vals };
    return { value: NaN, vals };
  }
  const tail = ys.slice(-5);
  const grow = tail.every((y, i) => i === 0 || (isFinite(y) && Math.abs(y) > Math.abs(tail[i - 1]) * 1.5));
  if (grow && Math.abs(tail[tail.length - 1]) > 1e5 && tail.every((y) => Math.sign(y) === Math.sign(tail[0]))) return { value: Math.sign(tail[0]) * Infinity, vals };
  const rich = ys.slice(0, -1).map((y, i) => (10 * ys[i + 1] - y) / 9);
  const pick = (seq, upto) => {
    let best = null;
    for (let i = 0; i < Math.min(seq.length, upto) - 1; i++) {
      const d = Math.abs(seq[i + 1] - seq[i]) / Math.max(1, Math.abs(seq[i + 1]));
      if (isFinite(d) && (!best || d < best.err)) best = { value: seq[i + 1], err: d };
    }
    return best;
  };
  const raw = pick(ys, 8), ext = pick(rich, 7);
  const best = [raw, ext].filter(Boolean).sort((p, q) => p.err - q.err)[0];
  if (!best || best.err > 1e-4) {
    const osc = Math.max(...finite.slice(-4)) - Math.min(...finite.slice(-4));
    if (osc > 1e-3 * Math.max(1, Math.abs(finite[finite.length - 1]))) return { value: NaN, vals, oscillates: true };
    return { value: finite[finite.length - 1], vals };
  }
  return { value: best.value, vals };
}

function limText(v) {
  return v === Infinity ? "∞" : v === -Infinity ? "-∞" : nice(v, 10);
}

function limTex(v) {
  return v === Infinity ? "\\infty" : v === -Infinity ? "-\\infty" : niceTex(v, 10);
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "النقطة", { allowInfinity: true });
  const dir = choice(input, "dir", "الاتجاه", ["both", "left", "right"], "both");
  const F = f1(f, v);
  const at = isFinite(a) ? ntex(a) : a > 0 ? "\\infty" : "-\\infty";
  const arrow = `${v} \\to ${at}${dir === "left" && isFinite(a) ? "^-" : dir === "right" && isFinite(a) ? "^+" : ""}`;
  const steps = [{ text: "المطلوب:", tex: `\\lim_{${arrow}} ${toTex(f)}` }];
  const blocks = [];
  let value = null, method = "";

  if (isFinite(a)) {
    const direct = F(a);
    const near = [F(a - 1e-7), F(a + 1e-7)];
    if (isFinite(direct) && near.every((y) => isFinite(y) && Math.abs(y - direct) < 1e-4 * Math.max(1, Math.abs(direct)))) {
      value = snap(direct);
      method = "direct";
      steps.push({ text: "الدالة متصلة عند النقطة، فنعوّض مباشرة:", tex: `f(${ntex(a)}) = ${limTex(value)}` });
    }
  }

  if (value === null && f.type === "op" && f.op === "/") {
    let N = f.a, D = f.b;
    const kind = (n, d) => {
      const nv = isFinite(a) ? f1(n, v)(a) : f1(n, v)(a > 0 ? 1e8 : -1e8);
      const dv = isFinite(a) ? f1(d, v)(a) : f1(d, v)(a > 0 ? 1e8 : -1e8);
      if (isFinite(a) && Math.abs(nv) < 1e-12 && Math.abs(dv) < 1e-12) return "0/0";
      if (!isFinite(a) && Math.abs(nv) > 1e6 && Math.abs(dv) > 1e6) return "∞/∞";
      if (isFinite(a) && !isFinite(nv) && !isFinite(dv)) return "∞/∞";
      return null;
    };
    let form = kind(N, D);
    for (let i = 0; i < 4 && form; i++) {
      steps.push(`بالتعويض نحصل على الصيغة غير المحددة $${form === "0/0" ? "\\frac{0}{0}" : "\\frac{\\infty}{\\infty}"}$، فنطبق قاعدة لوبيتال (نشتق البسط والمقام كلاً على حدة):`);
      N = diff(N, v); D = diff(D, v);
      steps.push({ tex: `\\lim_{${arrow}} \\frac{${toTex(N)}}{${toTex(D)}}` });
      const q = simplify({ type: "op", op: "/", a: N, b: D });
      const Q = f1(q, v);
      if (isFinite(a)) {
        const val = Q(a);
        const nb = [Q(a - 1e-7), Q(a + 1e-7)];
        if (isFinite(val) && nb.every((y) => isFinite(y) && Math.abs(y - val) < 1e-4 * Math.max(1, Math.abs(val)))) {
          value = snap(val); method = "lhopital";
          steps.push({ text: "الآن التعويض المباشر ممكن:", tex: `= ${limTex(value)}` });
          break;
        }
      } else {
        const s = numericSide(Q, a, a > 0 ? 1 : -1);
        if (isFinite(s.value) || Math.abs(s.value) === Infinity) {
          const nd = f1(D, v)(a > 0 ? 1e6 : -1e6);
          if (isFinite(nd)) { value = snap(s.value); method = "lhopital"; steps.push({ tex: `= ${limTex(value)}` }); break; }
        }
      }
      form = kind(N, D);
    }
  }

  if (value === null) {
    method = "numeric";
    const sides = dir === "both" && isFinite(a) ? [-1, 1] : dir === "left" ? [-1] : dir === "right" ? [1] : [a > 0 ? 1 : -1];
    const res = sides.map((s) => ({ s, ...numericSide(F, a, s) }));
    const rows = [];
    for (let i = 0; i < 8; i++) rows.push(res.flatMap((r) => [fmt(r.vals[i][0], 10), isFinite(r.vals[i][1]) ? fmt(r.vals[i][1], 10) : "غير معرّف"]));
    const head = res.flatMap((r) => [r.s < 0 ? (isFinite(a) ? `${v} من اليسار` : v) : isFinite(a) ? `${v} من اليمين` : v, `f(${v})`]);
    blocks.push({ type: "table", caption: "جدول الاقتراب العددي", head, rows });
    steps.push("التعويض المباشر لا يعطي قيمة محددة، فنقدّر النهاية عددياً بالاقتراب من النقطة بقيم متزايدة القرب (انظر الجدول).");
    const vals = res.map((r) => r.value);
    if (vals.some((x) => Number.isNaN(x))) {
      steps.push("القيم تتذبذب أو غير معرّفة ولا تقترب من عدد واحد.");
      return { results: [{ label: "النهاية", value: "غير موجودة" }], steps, blocks, copy: "النهاية غير موجودة" };
    }
    if (vals.length === 2) {
      const [l, r] = vals.map(snap);
      const same = l === r || (isFinite(l) && isFinite(r) && Math.abs(l - r) < 1e-5 * Math.max(1, Math.abs(l)));
      steps.push(`النهاية من اليسار ≈ ${limText(l)} والنهاية من اليمين ≈ ${limText(r)}.`);
      if (!same) {
        steps.push("النهايتان من الجهتين مختلفتان، لذلك النهاية غير موجودة.");
        return {
          results: [{ label: "النهاية", value: "غير موجودة" }, { label: "من اليسار", value: limText(l) }, { label: "من اليمين", value: limText(r) }],
          steps, blocks, copy: `النهاية غير موجودة (يسار ${limText(l)}، يمين ${limText(r)})`
        };
      }
      value = l;
    } else value = snap(vals[0]);
    blocks.push({ type: "note", text: "هذه النهاية مقدّرة عددياً، وقد لا تكون دقيقة في الحالات الصعبة." });
  }

  const label = method === "numeric" ? "النهاية (تقدير عددي)" : "النهاية";
  return {
    results: [{ label, tex: `\\lim_{${arrow}} ${toTex(f)} = ${limTex(value)}`, text: `= ${limText(value)}` }],
    steps, blocks, copy: `lim ${toText(f)} = ${limText(value)}`
  };
}
