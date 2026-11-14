import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/cron-explainer.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const runs = (expr, start, count = 5) => mod.nextRuns(mod.parseCron(expr), mod.parseStart(start), count).map(mod.formatRun);

test("*/15 9-17 * * 1-5 تبدأ الساعة 09:00 ثم 09:15 يوم الإثنين", () => {
  assert.deepEqual(runs("*/15 9-17 * * 1-5", "2026-01-05 08:00", 2), ["2026-01-05 09:00", "2026-01-05 09:15"]);
});

test("0 0 1 1 * التالية هي 2027-01-01", () => {
  assert.deepEqual(runs("0 0 1 1 *", "2026-01-05 08:00", 1), ["2027-01-01 00:00"]);
});

test("@daily يساوي 0 0 * * *", () => {
  assert.deepEqual(runs("@daily", "2026-01-05 00:00"), runs("0 0 * * *", "2026-01-05 00:00"));
  assert.deepEqual(runs("@daily", "2026-01-05 00:00", 2), ["2026-01-05 00:00", "2026-01-06 00:00"]);
});

test("0 12 * * SUN تعمل كل أحد الساعة 12:00", () => {
  assert.deepEqual(runs("0 12 * * SUN", "2026-01-05 00:00", 3), ["2026-01-11 12:00", "2026-01-18 12:00", "2026-01-25 12:00"]);
});

test("قاعدة يوم الشهر أو يوم الأسبوع (13 أو الجمعة)", () => {
  assert.deepEqual(runs("0 0 13 * 5", "2026-01-05 00:00", 5), [
    "2026-01-09 00:00",
    "2026-01-13 00:00",
    "2026-01-16 00:00",
    "2026-01-23 00:00",
    "2026-01-30 00:00"
  ]);
});

test("التفكيك: الخطوات والنطاقات وتطبيع 7 إلى الأحد", () => {
  const p = mod.parseCron("*/15 9-17 * * 1-5");
  assert.deepEqual(p.minute, [0, 15, 30, 45]);
  assert.equal(p.hour.length, 9);
  assert.deepEqual(p.dow, [1, 2, 3, 4, 5]);
  assert.deepEqual(mod.parseCron("0 0 * * 5-7").dow, [0, 5, 6]);
  assert.deepEqual(mod.parseCron("0 0 * JAN,MAR *").month, [1, 3]);
});

test("لا توجد تشغيلات لـ 30 شباط", () => {
  const res = mod.solve({ expr: "0 0 30 2 *", start: "2026-01-05 08:00", count: "5" });
  assert.ok(res.blocks.some((b) => b.type === "note" && b.text.includes("لم يُعثر على أي تشغيل")));
  assert.equal(res.results[2].value, "0");
});

test("أخطاء الإدخال تُنسب إلى الحقل الصحيح", () => {
  throwsInput(() => mod.solve({ expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "* * *", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "*/0 * * * *", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "5-1 * * * *", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "0 0 * FOO *", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "@sometimes", start: "2026-01-05 08:00", count: "5" }), "expr");
  throwsInput(() => mod.solve({ expr: "0 0 * * *", start: "2026-02-30 00:00", count: "5" }), "start");
});
