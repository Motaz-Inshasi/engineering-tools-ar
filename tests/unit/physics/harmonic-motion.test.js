import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/harmonic-motion.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve({ ...mod.meta.example.values, ...o });
const val = (res, key) => parseFloat(res.results.find((x) => x.label.includes(key)).value);

test("نابض: k=200 و m=0.5 و A=0.1 تعطي ω=20 و f=3.183 و T=0.3142 s", () => {
  const r = run({ mode: "spring", k: "200", ms: "0.5", A: "0.1" });
  close(val(r, "التردد الزاوي"), 20, 1e-3);
  close(val(r, "التردد f"), 3.18310, 1e-3);
  close(val(r, "الزمن الدوري"), 2 * Math.PI * Math.sqrt(0.5 / 200), 1e-3);
});

test("نابض: السرعة القصوى والتسارع الأقصى والطاقة", () => {
  const r = run({ mode: "spring", k: "200", ms: "0.5", A: "0.1" });
  close(val(r, "السرعة القصوى"), 2, 1e-3);
  close(val(r, "التسارع الأقصى"), 40, 1e-3);
  close(val(r, "الطاقة الكلية"), 1, 1e-3);
});

test("نابض: حفظ الطاقة يعني ½ m vmax² = E", () => {
  const r = run({ mode: "spring", k: "350", ms: "1.4", A: "0.07" });
  const vmax = val(r, "السرعة القصوى");
  const E = val(r, "الطاقة الكلية");
  close(0.5 * 1.4 * vmax * vmax, E, 2e-3);
});

test("بندول: L=1 و g=9.81 و θ0=5° تعطي T ≈ 2.0064 s", () => {
  const r = run({ mode: "pendulum", L: "1", g: "9.81", th: "5" });
  close(val(r, "تقريب"), 2.00643, 1e-3);
  close(val(r, "التردد f"), 0.498405, 1e-3);
});

test("بندول بزاوية 90°: الزمن الدقيق ≈ 7.4163·√(L/g)", () => {
  const r = run({ mode: "pendulum", L: "1", g: "9.81", th: "90" });
  close(val(r, "الدقيق"), 7.4163 * Math.sqrt(1 / 9.81), 1e-3);
  assert.ok(r.blocks.some((b) => b.type === "note" && b.tone === "warn"));
});

test("بندول بزاوية صغيرة لا يظهر تحذير الزاوية", () => {
  const r = run({ mode: "pendulum", L: "1", g: "9.81", th: "5" });
  assert.ok(!r.blocks.some((b) => b.type === "note"));
});

test("الرسم يغطي دورتين بالضبط", () => {
  const r = run({ mode: "spring", k: "200", ms: "0.5", A: "0.1" });
  const plot = r.blocks.find((b) => b.type === "plot");
  const pts = plot.series[0].points;
  const T = 2 * Math.PI / 20;
  close(pts[pts.length - 1][0], 2 * T, 1e-9);
  close(pts[0][1], 0.1, 1e-12);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ mode: "spring", k: "0" }), "k");
  throwsInput(() => run({ mode: "spring", ms: "" }), "ms");
  throwsInput(() => run({ mode: "pendulum", th: "180" }), "th");
  throwsInput(() => run({ mode: "pendulum", L: "-1" }), "L");
  throwsInput(() => run({ mode: "bad" }), "mode");
});
