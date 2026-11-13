import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/student/study-planner.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { examDate: "2026-01-11", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" };
const plan = (over) => mod.solve({ ...base, ...over });

test("10 أيام، يوم راحة أسبوعياً (الجمعة)، ويومان مراجعة", () => {
  const v = plan({}).values;
  assert.equal(v.D, 10);
  assert.equal(v.restCount, 2);
  assert.equal(v.studyDays, 8);
  assert.equal(v.reviewCount, 2);
  assert.equal(v.L, 6);
  close(v.perDay, 8 / 6, 1e-9);
  close(v.totalHours, 16, 1e-9);
});

test("راحتان أسبوعياً توزعان على الجمعة والثلاثاء", () => {
  const v = plan({ restDays: "2" }).values;
  assert.equal(v.restCount, 3);
  assert.equal(v.studyDays, 7);
});

test("جدول يوم السبت وحده للدراسة يحمل كل الموضوعات", () => {
  const r = plan({ examDate: "2026-01-10", startDate: "2026-01-03", topics: "3", hours: "1", restDays: "6", revisionDays: "0" });
  assert.equal(r.values.L, 1);
  assert.equal(r.blocks[0].rows[0][2], "الموضوعات 1–3");
  assert.equal(r.blocks[0].rows[1][2], "راحة");
});

test("حساب التواريخ بالـ UTC يعبر نهاية الشهر وشباط الكبيسة", () => {
  assert.equal(plan({ examDate: "2026-03-01", startDate: "2026-02-27", topics: "1", restDays: "0", revisionDays: "0" }).values.D, 2);
  assert.equal(plan({ examDate: "2028-03-01", startDate: "2028-02-28", topics: "1", restDays: "0", revisionDays: "0" }).values.D, 2);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => plan({ examDate: "2026-01-01" }), "examDate");
  throwsInput(() => plan({ examDate: "2026-02-30" }), "examDate");
  throwsInput(() => plan({ examDate: "01/10/2026" }), "examDate");
  throwsInput(() => plan({ startDate: "2026-1-1" }), "startDate");
  throwsInput(() => plan({ topics: "0" }), "topics");
  throwsInput(() => plan({ topics: "201" }), "topics");
  throwsInput(() => plan({ restDays: "7" }), "restDays");
  throwsInput(() => plan({ hours: "0" }), "hours");
  throwsInput(() => plan({ revisionDays: "10" }), "revisionDays");
  throwsInput(() => plan({ examDate: "2026-01-02", restDays: "6", revisionDays: "0" }), "restDays");
});
