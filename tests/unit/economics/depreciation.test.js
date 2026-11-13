import { test } from "node:test";
import { assert, throwsInput, checkExample, close, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/depreciation.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2", ...values });
const rowsOf = (res) => res.blocks[0].rows;
const num = (s) => Number(String(s).replace(/,/g, ""));

test("القسط الثابت: 1800 كل سنة حتى القيمة الخردة", () => {
  const rows = rowsOf(calc({}));
  for (const row of rows) assert.equal(row[1], "1,800.00");
  assert.equal(rows[4][2], "9,000.00");
  assert.equal(rows[4][3], "1,000.00");
});

test("مجموع أرقام السنين: السنة الأولى 3000 والأخيرة 600", () => {
  const rows = rowsOf(calc({ method: "syd" }));
  assert.equal(rows[0][1], "3,000.00");
  assert.equal(rows[1][1], "2,400.00");
  assert.equal(rows[4][1], "600.00");
  assert.equal(rows[4][3], "1,000.00");
});

test("القسط المتناقص يبدأ بـ 4000 ولا يهبط عن القيمة الخردة", () => {
  const rows = rowsOf(calc({ method: "db", factor: "2" }));
  assert.equal(rows[0][1], "4,000.00");
  assert.equal(rows[1][1], "2,400.00");
  assert.equal(rows[4][1], "296.00");
  assert.equal(rows[4][3], "1,000.00");
  for (const r of rows) assert.ok(num(r[3]) >= 1000 - 1e-9);
});

test("التحول إلى القسط الثابت يصل بالقيمة الدفترية إلى الصفر دون نزول", () => {
  const rows = rowsOf(calc({ cost: "10000", salvage: "0", method: "db", factor: "2" }));
  assert.equal(rows[3][1], "1,080.00");
  assert.equal(rows[4][1], "1,080.00");
  assert.equal(rows[4][3], "0.00");
  close(num(rows[4][2]), 10000, 1e-9);
});

test("المجمّع النهائي يساوي التكلفة ناقص الخردة في كل الطرق", () => {
  for (const method of ["sl", "db", "syd"]) {
    const rows = rowsOf(calc({ method }));
    assert.equal(rows[4][2], "9,000.00", method);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ salvage: "20000" }), "salvage");
  throwsInput(() => calc({ cost: "0" }), "cost");
  throwsInput(() => calc({ life: "0" }), "life");
  throwsInput(() => calc({ life: "2.5" }), "life");
  throwsInput(() => calc({ method: "x" }), "method");
});
