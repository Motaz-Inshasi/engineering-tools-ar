import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/signals/fourier-series.js";
import { integrateNumeric } from "../../../lib/core/numeric.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const WAVES = ["square", "triangle", "sawtooth", "halfwave", "fullwave", "pulse"];

test("تحقق مستقل: المعاملات المغلقة = التكامل العددي على دور واحد", () => {
  const T = 0.02, w0 = (2 * Math.PI) / T, A = 2.5, d = 0.3;
  for (const w of WAVES) {
    const x = mod.waveform(w, A, T, d);
    const brk = { pulse: [-d * T / 2, d * T / 2], square: [0], sawtooth: [], halfwave: [0], triangle: [0], fullwave: [0] }[w];
    const pts = [-T / 2, ...brk, T / 2];
    const integ = (g) => pts.slice(1).reduce((s, b, i) => s + integrateNumeric(g, pts[i], b, { tol: 1e-12 }).value, 0);
    close(integ(x) / T, mod.coefficients(w, A, 0, d).a, 1e-8, `${w} a0`);
    for (let n = 1; n <= 7; n++) {
      const a = (2 / T) * integ((t) => x(t) * Math.cos(n * w0 * t));
      const b = (2 / T) * integ((t) => x(t) * Math.sin(n * w0 * t));
      const c = mod.coefficients(w, A, n, d);
      assert.ok(Math.abs(a - c.a) < 1e-8 * A, `${w} a${n}: ${a} vs ${c.a}`);
      assert.ok(Math.abs(b - c.b) < 1e-8 * A, `${w} b${n}: ${b} vs ${c.b}`);
    }
  }
});

test("قيم معروفة وبارسيفال", () => {
  close(mod.coefficients("square", 1, 1).b, 4 / Math.PI);
  close(mod.coefficients("triangle", 1, 3).a, 8 / (9 * Math.PI ** 2));
  close(mod.coefficients("fullwave", 10, 0).a, 20 / Math.PI);
  const r = mod.solve({ wave: "sawtooth", A: "1", f: "1k", N: "50" });
  close(r.results[3].value, 1 / Math.sqrt(3));
  assert.ok(r.results[4].value > 98 && r.results[4].value < 100);
  const p = mod.solve({ wave: "pulse", A: "5", f: "1", d: "0.5", N: "1" });
  close(p.results[1].value, 2.5);
});

test("قيم حدية", () => {
  const big = mod.solve({ wave: "square", A: "1e6", f: "1e9", N: "3" });
  close(big.results[3].value, 1e6);
  const tiny = mod.solve({ wave: "triangle", A: "1e-6", f: "0.001", N: "1" });
  close(tiny.results[3].value, 1e-6 / Math.sqrt(3));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ wave: "pulse", A: "1", f: "50", d: "1.5", N: "5" }), "d");
  throwsInput(() => mod.solve({ wave: "square", A: "0", f: "50", N: "5" }), "A");
  throwsInput(() => mod.solve({ wave: "square", A: "1", f: "-50", N: "5" }), "f");
  throwsInput(() => mod.solve({ wave: "square", A: "1", f: "50", N: "51" }), "N");
  throwsInput(() => mod.solve({ wave: "sine", A: "1", f: "50", N: "5" }), "wave");
});
