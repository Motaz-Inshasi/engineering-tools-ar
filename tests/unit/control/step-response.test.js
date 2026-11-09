import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/control/step-response.js";
import { inverse } from "../../../lib/signals/laplace.js";
import { evaluate } from "../../../lib/core/parser.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (r, part) => r.results.find((x) => x.label.includes(part)).value;

test("قيم كتابية معروفة", () => {
  const r = mod.solve({ order: "2", K: "1", wn: "10", zeta: "0.5" });
  close(v(r, "التجاوز"), 16.303353482158, 1e-9);
  close(v(r, "الذروة"), Math.PI / (10 * Math.sqrt(0.75)));
  const f = mod.solve({ order: "1", K: "5", tau: "2" });
  close(v(f, "الصعود"), 2 * Math.log(9), 1e-3);
  close(v(f, "الاستقرار"), 2 * Math.log(50), 1e-3);
  const c = mod.solve({ order: "2", K: "1", wn: "2", zeta: "1" });
  assert.equal(v(c, "التجاوز"), 0);
  close(v(c, "الصعود"), 3.3579 / 2, 1e-3);
  const u = mod.solve({ order: "2", K: "1", wn: "3", zeta: "0" });
  assert.equal(v(u, "الاستقرار"), "لا يستقر");
  const neg = mod.solve({ order: "2", K: "-2", wn: "5", zeta: "0.2" });
  close(v(neg, "التجاوز"), 100 * Math.exp((-0.2 * Math.PI) / Math.sqrt(0.96)), 1e-9);
});

test("تحقق مستقل: المعادلة الزمنية = عكس لابلاس للدالة K ωn²/(s(s²+2ζωn s+ωn²))", () => {
  for (const [wn, zeta, K] of [[4, 0.3, 1], [2, 1, 3], [5, 2.5, -1], [1e3, 0.7, 1], [0.01, 0.1, 2]]) {
    const y = mod.response(2, { K, wn, zeta });
    const Fs = `${K * wn * wn}/(s (s^2 + ${2 * zeta * wn}s + ${wn * wn}))`;
    const f = inverse(Fs).ft;
    for (const k of [0.3, 1, 2.5, 5]) {
      const t = k / wn;
      close(y(t), evaluate(f, { t }), 1e-7, `${wn},${zeta}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ order: "2", K: "1", wn: "4", zeta: "-0.5" }), "zeta");
  throwsInput(() => mod.solve({ order: "2", K: "1", wn: "0", zeta: "0.5" }), "wn");
  throwsInput(() => mod.solve({ order: "1", K: "1", tau: "-1" }), "tau");
  throwsInput(() => mod.solve({ order: "1", K: "0", tau: "1" }), "K");
  throwsInput(() => mod.solve({ order: "3", K: "1" }), "order");
});
