import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/rectifier-ripple.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (type, Vrms, C, RL, Vd = "0.7", f = "50") => mod.solve({ type, Vrms, f, C, RL, Vd }).results;

test("قيم معروفة", () => {
  assert.equal(R("half", "10", "1000u", "100", "0")[0].value, "14.14 V");
  assert.equal(R("bridge", "10", "1000u", "100", "0.7")[0].value, "12.74 V");
  assert.equal(R("center", "10", "1000u", "100", "0.7")[5].value, "27.58 V");
  assert.equal(R("half", "10", "1000u", "100", "0")[1].value, "2.828 V");
  assert.equal(R("bridge", "10", "1000u", "100", "0")[1].value, "1.414 V");
  assert.equal(R("bridge", "230", "1", "1e6", "1")[1].value, "3.233 µV");
});

test("تحقق مستقل: التموج بالتقريب قريب من محاكاة تفريغ المكثف عندما يكون صغيراً", () => {
  const Vrms = 12, f = 50, C = 4.7e-3, RL = 50, Vp = Math.SQRT2 * Vrms - 1.4;
  const r = mod.solve({ type: "bridge", Vrms: String(Vrms), f: String(f), C: String(C), RL: String(RL), Vd: "0.7" });
  const sim = r.blocks[0].series[1].points.slice(300).map((p) => p[1]);
  const simRipple = Math.max(...sim) - Math.min(...sim);
  const approx = Vp / (2 * f * RL * C);
  assert.ok(Math.abs(simRipple - approx) / approx < 0.15, `${simRipple} vs ${approx}`);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" }), "Vrms");
  throwsInput(() => mod.solve({ type: "bridge", Vrms: "12", f: "50", C: "0", RL: "100", Vd: "0.7" }), "C");
  throwsInput(() => mod.solve({ type: "bridge", Vrms: "12", f: "50", C: "1u", RL: "-1", Vd: "0.7" }), "RL");
  throwsInput(() => mod.solve({ type: "triple", Vrms: "12", f: "50", C: "1u", RL: "1", Vd: "0.7" }), "type");
});
