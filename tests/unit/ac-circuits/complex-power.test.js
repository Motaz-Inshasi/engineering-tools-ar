import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/complex-power.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const val = (r, label) => r.results.find((x) => x.label.startsWith(label)).value;

test("قيم معروفة", () => {
  const r = mod.solve({ mode: "vi", V: "230", I: "10", theta: "36.87", f: "50" });
  assert.equal(val(r, "القدرة الفعالة"), "1.84 kW");
  assert.equal(val(r, "القدرة غير الفعالة"), "1.38 kVAR");
  assert.equal(val(r, "القدرة الظاهرية"), "2.3 kVA");
  assert.match(val(r, "معامل القدرة"), /^0\.8 /);
  const c = mod.solve({ mode: "vi", V: "100", I: "1", theta: "-60", f: "50" });
  assert.match(val(c, "معامل القدرة"), /سعوي/);
  const u = mod.solve({ mode: "ppf", V: "400", P: "1", pf: "1", nature: "lag", f: "50" });
  assert.match(val(u, "معامل القدرة"), /مقاومي/);
});

test("تحقق مستقل: بعد التصحيح يصبح معامل القدرة هو المستهدف", () => {
  for (const [P, pf, t, V, f] of [[50e3, 0.7, 0.95, 400, 50], [1e3, 0.5, 0.99, 230, 60], [1e6, 0.85, 0.9, 11e3, 50]]) {
    const r = mod.solve({ mode: "ppf", V: String(V), P: String(P), pf: String(pf), nature: "lag", target: String(t), f: String(f) });
    const C = parseNumber(val(r, "سعة المكثف").replace(/\s*F$/, "").replace(/\s/g, ""));
    const Qc = 2 * Math.PI * f * C * V * V;
    const Q2 = P * Math.tan(Math.acos(pf)) - Qc;
    close(P / Math.hypot(P, Q2), t, 2e-3);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" }), "pf");
  throwsInput(() => mod.solve({ mode: "ppf", V: "400", P: "50k", pf: "0.9", nature: "lag", target: "0.8", f: "50" }), "target");
  throwsInput(() => mod.solve({ mode: "ppf", V: "400", P: "50k", pf: "0.9", nature: "lead", target: "0.95", f: "50" }), "target");
  throwsInput(() => mod.solve({ mode: "vi", V: "400", I: "1", theta: "120", f: "50" }), "theta");
  throwsInput(() => mod.solve({ mode: "vi", V: "0", I: "1", theta: "10", f: "50" }), "V");
});
