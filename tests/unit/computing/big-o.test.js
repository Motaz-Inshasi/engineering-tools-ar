import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/computing/big-o.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (n, ops, cls) => mod.solve({ n: String(n), ops: String(ops), cls });

test("n = 10^6 و 10^9 عملية/ث: O(n²) = 10^12 عملية = 1000 s", () => {
  const res = run(1e6, 1e9, "quad");
  assert.equal(resultValue(res, "بالثواني"), "1000 s");
  assert.equal(resultValue(res, "التقريبي"), "16 دقيقة و40 ثانية");
  assert.equal(resultValue(res, "عدد العمليات"), "1 × 10^12");
});

test("O(n) و O(1) بوحدات صغيرة صحيحة", () => {
  assert.equal(resultValue(run(1e6, 1e9, "lin"), "التقريبي"), "1 ms");
  assert.equal(resultValue(run(1, 1e9, "const"), "التقريبي"), "1 ns");
});

test("لوغاريتم العاملي يطابق القيم المعروفة", () => {
  close(mod.log10Factorial(19), Math.log10(1.21645100408832e17), 1e-9, "19!");
  assert.ok(Math.abs(mod.log10Factorial(20) - Math.log10(2432902008176640000)) < 1e-3, "20!");
});

test("الوحدات الكبيرة: سنوات وأطول من عمر الكون", () => {
  assert.ok(resultValue(run(60, 1e9, "exp"), "التقريبي").includes("36 سنة"));
  assert.equal(resultValue(run(100, 1e9, "exp"), "التقريبي"), "أطول من عمر الكون");
  assert.equal(resultValue(run(100, 1e9, "exp"), "بالثواني").startsWith("أكبر"), true);
});

test("ترتيب النمو صحيح لكل n", () => {
  for (let n = 4; n <= 40; n++) {
    assert.ok(mod.log10Ops("quad", n) > mod.log10Ops("lin", n));
    assert.ok(mod.log10Ops("fact", n) > mod.log10Ops("exp", n));
  }
});

test("الرسم محدود بسقف 1000 ويظهر تنبيه عند تجاوزه", () => {
  const res = run(1e6, 1e9, "quad");
  const plot = res.blocks.find((b) => b.type === "plot");
  assert.ok(plot.series.every((s) => s.points.length <= 201));
  assert.ok(res.blocks.some((b) => b.type === "note"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run(0, "1e9", "quad"), "n");
  throwsInput(() => run(1e13, "1e9", "quad"), "n");
  throwsInput(() => run(10, "0", "quad"), "ops");
  throwsInput(() => run(10, "1e9", "foo"), "cls");
});
