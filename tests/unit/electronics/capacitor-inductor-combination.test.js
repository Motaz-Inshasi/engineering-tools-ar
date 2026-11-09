import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/electronics/capacitor-inductor-combination.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.equivalent("C", "parallel", [1e-6, 2e-6]), 3e-6);
  close(mod.equivalent("C", "series", [2e-6, 2e-6]), 1e-6);
  close(mod.equivalent("L", "series", [1e-3, 2e-3]), 3e-3);
  close(mod.equivalent("L", "parallel", [4e-3, 4e-3]), 2e-3);
  close(mod.equivalent("C", "series", [1e-12, 1]), 1e-12, 1e-9);
  assert.equal(mod.solve({ kind: "C", mode: "parallel", list: "1u, 1u", V: "10" }).results[2].value, "100 µJ");
});

test("تحقق مستقل: على التوالي الشحنة نفسها ومجموع الجهود = الجهد الكلي", () => {
  const rand = rng(15);
  for (let t = 0; t < 30; t++) {
    const cs = Array.from({ length: 2 + Math.floor(rand() * 5) }, () => 1e-9 + rand() * 1e-4);
    const V = 1 + rand() * 100;
    const Ceq = mod.equivalent("C", "series", cs);
    const sumV = cs.reduce((s, c) => s + (Ceq * V) / c, 0);
    close(sumV, V, 1e-12);
    const energy = cs.reduce((s, c) => s + 0.5 * c * ((Ceq * V) / c) ** 2, 0);
    close(energy, 0.5 * Ceq * V * V, 1e-12);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ kind: "C", mode: "series", list: "10u, 0" }), "list");
  throwsInput(() => mod.solve({ kind: "C", mode: "series", list: "" }), "list");
  throwsInput(() => mod.solve({ kind: "R", mode: "series", list: "1" }), "kind");
  throwsInput(() => mod.solve({ kind: "C", mode: "series", list: "1u", V: "0" }), "V");
});
