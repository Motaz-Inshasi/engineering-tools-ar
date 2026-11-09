import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/rlc-circuit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const r = (conn, R, L, C, f, V) => mod.solve({ conn, R, L, C, f, V });
const pf = (x) => x.results.find((q) => q.label === "معامل القدرة").value;

test("قيم معروفة", () => {
  const f0 = 1 / (2 * Math.PI * Math.sqrt(0.1 * 1e-4));
  const res = r("series", "10", "0.1", "1e-4", String(f0), "100");
  close(pf(res), 1, 1e-9);
  assert.match(res.results[3].value, /رنين/);
  const ind = r("series", "3", "0.1", "1e9", String(4 / (2 * Math.PI * 0.1)), "10");
  close(pf(ind), 0.6, 1e-6);
  assert.match(ind.results[3].value, /حثية/);
  const par = r("parallel", "100", "1", "1e-9", "1", "10");
  assert.match(par.results[3].value, /حثية/);
  const cap = r("series", "1", "1e-9", "1e-9", "1000", "1");
  assert.match(cap.results[3].value, /سعوية/);
  close(pf(r("parallel", "1e6", "1", "1", String(1 / (2 * Math.PI)), "1")), 1, 1e-9);
});

test("تحقق مستقل: KVL و KCL بالطور يتحققان دائماً (الخطوات تذكر خطأ ≈ 0)", () => {
  const rand = rng(41);
  for (let t = 0; t < 40; t++) {
    const args = [rand() < 0.5 ? "series" : "parallel", String(1 + rand() * 100), String(1e-3 + rand()), String(1e-7 + rand() * 1e-3), String(10 + rand() * 1e4), String(1 + rand() * 300)];
    const out = r(...args);
    const step = out.steps.find((s) => typeof s === "string" && s.includes("تحقق"));
    const m = step.match(/= (0|[\d.]+ \\times 10\^\{-(\d+)\})\\ [VA]\$/);
    assert.ok(m && (m[1] === "0" || Number(m[2]) >= 9), `${args}: ${step}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => r("series", "30", "100m", "0", "50", "230"), "C");
  throwsInput(() => r("series", "-1", "1", "1", "50", "230"), "R");
  throwsInput(() => r("series", "1", "1", "1", "0", "230"), "f");
  throwsInput(() => r("delta", "1", "1", "1", "50", "230"), "conn");
});
