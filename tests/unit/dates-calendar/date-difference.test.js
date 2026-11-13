import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/dates-calendar/date-difference.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const diff = (d1, d2, o = {}) => mod.solve({ mode: "diff", d1, d2, weekend: "fs", ...o }).results.map((r) => r.value);

test("فروق معروفة", () => {
  assert.equal(diff("2024-01-01", "2025-01-01")[0], "366 يوماً");
  assert.equal(diff("2024-01-01", "2025-01-01")[1], "سنة واحدة");
  assert.equal(diff("2000-01-31", "2000-03-01")[1], "شهر واحد ويوم واحد");
  assert.equal(diff("2026-11-20", "2026-11-13")[0], "7 أيام");
  assert.equal(diff("2026-11-13", "2026-11-13", { inclusive: "1" })[0], "يوم واحد");
});

test("أيام العمل", () => {
  assert.equal(diff("2026-11-13", "2026-11-20")[3], "5 أيام");
  assert.equal(diff("2026-11-13", "2026-11-20", { weekend: "none" })[3], "7 أيام");
  assert.equal(diff("2026-01-01", "2026-12-31")[3], "260 يوماً");
});

test("إضافة الأيام وطرحها", () => {
  assert.equal(mod.solve({ mode: "add", d1: "2026-01-31", days: "30" }).copy, "2026-01-31 + 30 يوماً = 2026-03-02");
  assert.equal(mod.solve({ mode: "add", d1: "2024-03-01", days: "-1" }).copy, "2024-03-01 − 1 يوماً = 2024-02-29");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "diff", d1: "abc", d2: "2026-01-01" }), "d1");
  throwsInput(() => mod.solve({ mode: "diff", d1: "2026-01-01", d2: "2026-13-01" }), "d2");
  throwsInput(() => mod.solve({ mode: "add", d1: "2026-01-01", days: "1.5" }), "days");
});
