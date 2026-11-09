import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/sensors/strain-gauge-bridge.js";
import { bridge } from "../../../lib/dc-circuits/wheatstone-bridge.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.output("half", 10, 2, 1e-3), 10e-3);
  close(mod.output("full", 5, 2.1, 500e-6), 5.25e-3);
  close(mod.output("quarter", 10, 2, 0), 0);
  close(mod.output("quarter", 10, 2, -1e-3), (10 * -2e-3) / 4 / (1 - 1e-3));
  close(mod.output("full", 1e3, 2, 1e-9), 2e-6);
  assert.equal(mod.solve({ cfg: "full", dir: "e2v", strain: "1000", GF: "2", Vex: "10", R: "350" }).results[3].value, "2 mV/V");
});

test("تحقق مستقل: ربع القنطرة = قنطرة ويتستون كاملة بمقاومة متغيرة، والعكس يعيد الانفعال", () => {
  const rand = rng(29);
  for (let t = 0; t < 50; t++) {
    const R = 120 + rand() * 1000, GF = 1.8 + rand() * 0.5, e = (rand() - 0.5) * 4e-3, V = 1 + rand() * 10;
    const dR = R * GF * e;
    close(mod.output("quarter", V, GF, e), bridge(V, R, R, R + dR, R), 1e-9);
    for (const cfg of ["quarter", "half", "full"]) close(mod.strainFrom(cfg, V, GF, mod.output(cfg, V, GF, e)), e, 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ cfg: "quarter", dir: "e2v", strain: "1000", GF: "0", Vex: "10", R: "350" }), "GF");
  throwsInput(() => mod.solve({ cfg: "quarter", dir: "e2v", strain: "1e6", GF: "2", Vex: "10", R: "350" }), "strain");
  throwsInput(() => mod.solve({ cfg: "quarter", dir: "v2e", Vo: "", GF: "2", Vex: "10", R: "350" }), "Vo");
  throwsInput(() => mod.solve({ cfg: "tenth", dir: "e2v", strain: "1", GF: "2", Vex: "10", R: "350" }), "cfg");
});
