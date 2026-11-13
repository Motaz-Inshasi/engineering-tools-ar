import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/architecture/polygon-area.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const poly = (verts, unit = "m") => mod.solve({ verts, unit });

test("مستطيل 4 × 3: المساحة 12 والمحيط 14 والمركز (2, 1.5)", () => {
  const v = poly("0 0\n4 0\n4 3\n0 3").values;
  close(v.area, 12, 1e-9);
  close(v.perimeter, 14, 1e-9);
  close(v.gx, 2, 1e-9);
  close(v.gy, 1.5, 1e-9);
  assert.equal(v.ccw, true);
});

test("مثلث قائم (0,0)(4,0)(0,3): المساحة 6 والمحيط 12 والمركز (4/3, 1)", () => {
  const v = poly("0 0\n4 0\n0 3").values;
  close(v.area, 6, 1e-9);
  close(v.perimeter, 12, 1e-9);
  close(v.gx, 4 / 3, 1e-9);
  close(v.gy, 1, 1e-9);
});

test("الترتيب مع عقارب الساعة يعكس الاتجاه ولا يغير المساحة", () => {
  const v = poly("0 0\n0 3\n4 0").values;
  assert.equal(v.ccw, false);
  close(v.area, 6, 1e-9);
});

test("شكل L غير محدّب: المساحة 12 والمحيط 16 والمركز (5/3, 5/3)", () => {
  const v = poly("0 0\n4 0\n4 2\n2 2\n2 4\n0 4").values;
  close(v.area, 12, 1e-9);
  close(v.perimeter, 16, 1e-9);
  close(v.gx, 5 / 3, 1e-9);
  close(v.gy, 5 / 3, 1e-9);
  assert.equal(v.crossing, false);
});

test("الفاصلة بين الإحداثيات تعطي النتيجة نفسها", () => {
  close(poly("0, 0\n4, 0\n4, 3\n0, 3").values.area, 12, 1e-9);
});

test("تنبيه عند تقاطع الأضلاع", () => {
  const r = poly("0 0\n4 0\n1 4\n4 3");
  assert.equal(r.values.crossing, true);
  assert.ok(r.blocks.some((b) => b.type === "note" && b.tone === "warn"));
});

test("الوحدة الافتراضية متر عند ترك الحقل فارغاً", () => {
  assert.equal(poly("0 0\n4 0\n4 3\n0 3", "").results[0].value, "12 m²");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => poly("0 0\n4 0"), "verts");
  throwsInput(() => poly("1 2 3\n0 0\n4 4"), "verts");
  throwsInput(() => poly("a b\n0 0\n1 1"), "verts");
  throwsInput(() => poly("0 0\n1 1\n2 2"), "verts");
});
