import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/personal-finance/budget-planner.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "", wantsActual: "", savingsActual: "" };
const calc = (values) => mod.solve({ ...base, ...values });

test("قاعدة 50/30/20 على دخل 10000", () => {
  const res = calc({});
  assert.equal(resultValue(res, "مبلغ الاحتياجات"), "5,000.00");
  assert.equal(resultValue(res, "مبلغ الرغبات"), "3,000.00");
  assert.equal(resultValue(res, "مبلغ الادخار"), "2,000.00");
});

test("قاعدة 70/20/10 على دخل 5000", () => {
  const res = calc({ income: "5000", method: "70-20-10" });
  assert.equal(resultValue(res, "مبلغ الاحتياجات"), "3,500.00");
  assert.equal(resultValue(res, "مبلغ الرغبات"), "1,000.00");
  assert.equal(resultValue(res, "مبلغ الادخار"), "500.00");
});

test("النسب المخصصة 40/35/25 على دخل 8000", () => {
  const res = calc({ income: "8000", method: "custom", needsPct: "40", wantsPct: "35", savePct: "25" });
  assert.equal(resultValue(res, "مبلغ الاحتياجات"), "3,200.00");
  assert.equal(resultValue(res, "مبلغ الرغبات"), "2,800.00");
  assert.equal(resultValue(res, "مبلغ الادخار"), "2,000.00");
});

test("الحكم يُظهر التجاوز في الاحتياجات والنقص في الادخار", () => {
  const rows = calc({ needsActual: "6000", savingsActual: "1500" }).blocks[0].rows;
  assert.ok(rows[0][4].startsWith("تجاوز الميزانية بـ 1,000.00"), rows[0][4]);
  assert.ok(rows[2][4].startsWith("أقل من المستهدف بـ 500.00"), rows[2][4]);
  assert.equal(rows[1][3], "—");
});

test("المصروف ضمن الميزانية يُعلن وفراً", () => {
  const rows = calc({ wantsActual: "2500" }).blocks[0].rows;
  assert.equal(rows[1][4], "ضمن الميزانية (وفر 500.00)");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ income: "0" }), "income");
  throwsInput(() => calc({ method: "custom", needsPct: "50", wantsPct: "30", savePct: "30" }), "savePct");
  throwsInput(() => calc({ method: "custom", needsPct: "150", wantsPct: "0", savePct: "0" }), "needsPct");
  throwsInput(() => calc({ needsActual: "-1" }), "needsActual");
  throwsInput(() => calc({ method: "weekly" }), "method");
});
