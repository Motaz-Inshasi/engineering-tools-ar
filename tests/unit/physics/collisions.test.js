import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/collisions.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const r = (o) => mod.solve(o).values;

test("تصادم مرن معروف: v1' = 1/3 و v2' = 13/3", () => {
  const v = r({ m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" });
  close(v.v1f, 1 / 3, 1e-9);
  close(v.v2f, 13 / 3, 1e-9);
  close(v.lost, 0, 1e-9);
  close(v.p1, 5, 1e-9);
});

test("تصادم عديم المرونة: تلتصق الأجسام وتفقد 50% من الطاقة", () => {
  const v = r({ m1: "1", v1: "2", m2: "1", v2: "0", type: "inelastic", e: "" });
  close(v.v1f, 1, 1e-9);
  close(v.v2f, 1, 1e-9);
  close(v.lost, 1, 1e-9);
  close(v.pct, 50, 1e-9);
});

test("معامل الارتداد: سرعة الابتعاد تساوي e مضروبة في سرعة الاقتراب", () => {
  const v = r({ m1: "1", v1: "2", m2: "1", v2: "0", type: "restitution", e: "0.5" });
  close(v.v1f, 0.5, 1e-9);
  close(v.v2f, 1.5, 1e-9);
  const w = r({ m1: "3", v1: "4", m2: "5", v2: "-2", type: "restitution", e: "0.7" });
  close(w.v2f - w.v1f, 0.7 * 6, 1e-9);
  close(w.p1, w.p0, 1e-9);
});

test("حفظ الزخم وعدم زيادة الطاقة في حالات متعددة", () => {
  const cases = [
    { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" },
    { m1: "3", v1: "4", m2: "5", v2: "-2", type: "restitution", e: "0.7" },
    { m1: "1.5", v1: "-2", m2: "4", v2: "1", type: "restitution", e: "0.2" },
    { m1: "10", v1: "0", m2: "2", v2: "-6", type: "inelastic", e: "" }
  ];
  for (const c of cases) {
    const v = r(c);
    close(v.p1, v.p0, 1e-9);
    assert.ok(v.KE1 <= v.KE0 + 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }), "m1");
  throwsInput(() => mod.solve({ m1: "2", v1: "3", m2: "1", v2: "-1", type: "restitution", e: "1.5" }), "e");
  throwsInput(() => mod.solve({ m1: "2", v1: "3", m2: "1", v2: "-1", type: "restitution", e: "" }), "e");
  throwsInput(() => mod.solve({ m1: "2", v1: "3", m2: "-1", v2: "-1", type: "elastic", e: "" }), "m2");
  throwsInput(() => mod.solve({ m1: "2", v1: "3", m2: "1", v2: "-1", type: "bogus", e: "" }), "type");
});
