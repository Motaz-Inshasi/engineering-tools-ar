import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/three-phase.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const get = (r, label) => parseNumber(r.results.find((x) => x.label.startsWith(label)).value.replace(/\s?(kW|W|kVAR|VAR|kVA|VA|A|mA|V|kV)$/, (m, u) => ({ kW: "k", kVAR: "k", kVA: "k", mA: "m", kV: "k" }[u] || "")).replace(/\s/g, ""));

test("قيم معروفة", () => {
  const y = mod.solve({ conn: "star", VL: "400", Z: "8+6j" });
  close(get(y, "جهد الطور"), 230.94, 1e-4);
  close(get(y, "تيار الخط"), 23.09, 1e-3);
  close(get(y, "القدرة الفعالة"), 12.8e3, 1e-3);
  const d = mod.solve({ conn: "delta", VL: "400", Z: "8+6j" });
  close(get(d, "تيار الطور"), 40, 1e-4);
  close(get(d, "تيار الخط"), 69.28, 1e-3);
  close(get(d, "القدرة الفعالة"), 38.4e3, 1e-3);
  assert.match(mod.solve({ conn: "star", VL: "400", Z: "10" }).results[6].value, /^1 /);
});

test("تحقق مستقل: P = 3 I² R و Q = 3 I² X، والدلتا تستهلك ثلاثة أضعاف النجمة", () => {
  const rand = rng(10);
  for (let t = 0; t < 30; t++) {
    const R = 1 + rand() * 50, X = (rand() - 0.5) * 50, VL = 100 + rand() * 1e4;
    const y = mod.solve({ conn: "star", VL: String(VL), Z: `${R}${X < 0 ? "-" : "+"}${Math.abs(X)}j` });
    const d = mod.solve({ conn: "delta", VL: String(VL), Z: `${R}${X < 0 ? "-" : "+"}${Math.abs(X)}j` });
    const Iy = VL / Math.sqrt(3) / Math.hypot(R, X);
    close(get(y, "القدرة الفعالة"), 3 * Iy * Iy * R, 1e-3);
    close(get(d, "القدرة الفعالة") / get(y, "القدرة الفعالة"), 3, 1e-3);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ conn: "star", VL: "400", Z: "0" }), "Z");
  throwsInput(() => mod.solve({ conn: "star", VL: "400", Z: "-5+2j" }), "Z");
  throwsInput(() => mod.solve({ conn: "star", VL: "-400", Z: "5" }), "VL");
  throwsInput(() => mod.solve({ conn: "zigzag", VL: "400", Z: "5" }), "conn");
});
