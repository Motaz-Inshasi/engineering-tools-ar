import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/wheatstone-bridge.js";
import { parseNetlist, solveMNA } from "../../../lib/core/circuit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.bridge(10, 1000, 1000, 1000, 1000), 0);
  close(mod.bridge(10, 1000, 1000, 1000, 1100), 10 * (0.5 - 1100 / 2100));
  close(mod.bridge(5, 120, 120, 120, 120.24), 5 * (0.5 - 120.24 / 240.24));
  assert.equal(mod.solve({ mode: "balance", R1: "100", R2: "200", R3: "300" }).results[0].text, "R4 = 600 Ω");
  assert.equal(mod.solve({ mode: "vout", Vs: "10", R1: "1k", R2: "2k", R3: "3k", R4: "6k" }).results[3].value, "متزنة");
  close(mod.bridge(1e3, 1e-3, 1e-3, 1e6, 1e6), 0);
});

test("تحقق مستقل: جهد الخرج وتيار الجلفانومتر = حل الدائرة كاملة", () => {
  const rand = rng(9);
  for (let t = 0; t < 30; t++) {
    const [R1, R2, R3, R4, Rg] = Array.from({ length: 5 }, () => 10 + rand() * 5000);
    const Vs = 1 + rand() * 20;
    close(mod.bridge(Vs, R1, R2, R3, R4), (() => {
      const s = solveMNA(parseNetlist(`V1 t 0 ${Vs}\nR1 t a ${R1}\nR2 a 0 ${R2}\nR3 t b ${R3}\nR4 b 0 ${R4}`));
      return s.V.a - s.V.b;
    })(), 1e-10);
    const r = mod.solve({ mode: "vout", Vs: String(Vs), R1: String(R1), R2: String(R2), R3: String(R3), R4: String(R4), Rg: String(Rg) });
    const s = solveMNA(parseNetlist(`V1 t 0 ${Vs}\nR1 t a ${R1}\nR2 a 0 ${R2}\nR3 t b ${R3}\nR4 b 0 ${R4}\nRG a b ${Rg}`));
    const Ig = s.branches.find((b) => b.name === "RG").i;
    const shown = r.results.find((x) => x.label === "تيار الجلفانومتر").value;
    assert.ok(shown.length > 0);
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    close(mod.bridge(Vs, R1, R2, R3, R4) / (Rth + Rg), Ig, 1e-10);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" }), "R2");
  throwsInput(() => mod.solve({ mode: "balance", R1: "0", R2: "1", R3: "1" }), "R1");
  throwsInput(() => mod.solve({ mode: "vout", Vs: "", R1: "1", R2: "1", R3: "1", R4: "1" }), "Vs");
  throwsInput(() => mod.solve({ mode: "zzz", R1: "1", R2: "1", R3: "1" }), "mode");
});
