import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/statistics/descriptive-stats.js";
import * as d from "../../../lib/statistics/dist.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  const r = mod.solve({ data: "2 4 4 4 5 5 7 9", conf: "95" });
  assert.equal(resultValue(r, "الانحراف المعياري للمجتمع"), "2");
  assert.equal(resultValue(r, "المنوال"), "4");
  assert.equal(resultValue(r, "الربيع الأول"), "4 / 5.5");
  assert.equal(resultValue(r, "فترة ثقة"), "[3.21251 ، 6.78749]");
  const r2 = mod.solve({ data: "1, 2, 3, 4, 100", conf: "95" });
  assert.equal(resultValue(r2, "القيم الشاذة"), "100");
  assert.equal(resultValue(r2, "الوسيط"), "3");
  assert.equal(resultValue(mod.solve({ data: "1 2 3", conf: "95" }), "المنوال"), "لا يوجد (كل قيمة مرة واحدة)");
});

test("مكتبة التوزيعات تطابق الجداول", () => {
  close(d.normCdf(1.96), 0.9750021, 1e-6);
  close(d.normInv(0.975), 1.959964, 1e-6);
  close(d.tInv(0.975, 10), 2.228139, 1e-6);
  close(d.chi2Inv(0.95, 1), 3.841459, 1e-6);
  close(d.binomCdf(3, 10, 0.5), 0.171875, 1e-9);
  close(d.poissonCdf(2, 3), 0.4231901, 1e-6);
  close(d.normCdf(-10), 7.619853e-24, 1e-5);
});

test("مجموع التكرارات يساوي n", () => {
  const r = mod.solve({ data: Array.from({ length: 50 }, (_, i) => (i * 37) % 23).join(" "), conf: "90" });
  assert.equal(r.blocks[1].rows.reduce((a, row) => a + Number(row[1]), 0), 50);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ data: "5", conf: "95" }), "data");
  throwsInput(() => mod.solve({ data: "1 2 x", conf: "95" }), "data");
  throwsInput(() => mod.solve({ data: "1 2 3", conf: "100" }), "conf");
});
