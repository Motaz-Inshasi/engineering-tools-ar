import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/biology/serial-dilution.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const series = (c0, factor, nsteps, vt = "1") => mod.solve({ mode: "series", c0, factor, nsteps, vt });
const cfu = (colonies, vplate, dcfu) => mod.solve({ mode: "cfu", colonies, vplate, dcfu });
const hemo = (cells, squares, dhemo) => mod.solve({ mode: "hemocytometer", cells, squares, dhemo });

test("التخفيف المتسلسل: 1000 بعد 3 خطوات من 1:10 = 1 مع تخفيف كلي 1:1000", () => {
  const res = series("1000", "10", "3");
  assert.equal(resultValue(res, "التركيز النهائي"), "1");
  assert.equal(resultValue(res, "التخفيف الكلي"), "1:1000");
  assert.equal(resultValue(res, "إجمالي المخفف"), "27");
  const rows = res.blocks[0].rows;
  assert.equal(rows.length, 4);
  assert.equal(rows[2][1], "1:100");
});

test("التخفيف 1:2 بعد 4 خطوات من 80 = 5", () => {
  close(Number(resultValue(series("80", "2", "4"), "التركيز النهائي")), 5, 1e-9);
});

test("عدّ المستعمرات: 150 مستعمرة من 0.1 mL عند 1e-6 = 1.5e9 CFU/mL", () => {
  assert.equal(resultValue(cfu("150", "0.1", "1e-6"), "وحدات تكوين"), "1.5 × 10^9 CFU/mL");
});

test("قيمة التخفيف الأكبر من 1 تُعامَل كمقلوب: 1e6 تعادل 1e-6", () => {
  assert.equal(resultValue(cfu("150", "0.1", "1000000"), "وحدات تكوين"), "1.5 × 10^9 CFU/mL");
  assert.equal(resultValue(cfu("150", "0.1", "1000000"), "عامل التخفيف"), "1e-6");
});

test("نطاق العد: خارج 30 إلى 300 يُظهر تحذيراً", () => {
  assert.ok(cfu("12", "0.1", "1e-4").blocks.some((b) => b.type === "note"));
  assert.ok(!cfu("150", "0.1", "1e-4").blocks.some((b) => b.type === "note"));
});

test("شريحة العدّ: 200 خلية في 4 مربعات مع تمييع 2 = 1e6 خلية/mL", () => {
  assert.equal(resultValue(hemo("200", "4", "2"), "لكل mL"), "1 × 10^6 خلية/mL");
  assert.equal(resultValue(hemo("50", "1", "1"), "لكل mL"), "5 × 10^5 خلية/mL");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => series("1000", "1", "3"), "factor");
  throwsInput(() => series("1000", "10", "0"), "nsteps");
  throwsInput(() => series("1000", "10", "16"), "nsteps");
  throwsInput(() => cfu("-5", "0.1", "1e-6"), "colonies");
  throwsInput(() => cfu("150", "0", "1e-6"), "vplate");
  throwsInput(() => hemo("200", "0", "2"), "squares");
  throwsInput(() => hemo("200", "4", "0.5"), "dhemo");
  throwsInput(() => mod.solve({ mode: "bogus" }), "mode");
});
