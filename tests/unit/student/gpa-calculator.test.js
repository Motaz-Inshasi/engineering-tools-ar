import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/student/gpa-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (courses, scale = "4", prevGpa = "", prevCredits = "") => mod.solve({ courses, scale, prevGpa, prevCredits });

test("معدل فصلي بمقياس 4 يساوي (12 + 13.2) ÷ 7 = 3.6", () => {
  close(run("Math, 3, A\nPhysics, 4, B+").values.gpa, 3.6, 1e-9);
  assert.equal(run("Math, 3, A\nPhysics, 4, B+").results[0].value, "3.6");
});

test("مقياس 5 والنسبة المئوية والأرقام المباشرة", () => {
  close(run("Calc, 3, A+\nLab, 1, C", "5").values.gpa, 4.5, 1e-9);
  close(run("a, 2, 80\nb, 3, 90", "100").values.gpa, 86, 1e-9);
  close(run("x, 3, 3.5", "4").values.gpa, 3.5, 1e-9);
  assert.equal(run("الرياضيات، 3، A").results[0].value, "4");
});

test("المعدل التراكمي: (3 × 30 + 25.2) ÷ 37", () => {
  const res = run("Math, 3, A\nPhysics, 4, B+", "4", "3", "30");
  close(res.values.cum, 115.2 / 37, 1e-9);
  assert.equal(res.results.find((r) => r.label === "المعدل التراكمي").value, "3.114");
});

test("رسائل الخطأ تشير إلى رقم السطر", () => {
  assert.throws(() => run("Math, 3, A\nPhysics, 4, Z"), (e) => {
    assert.match(e.message, /السطر 2/);
    return true;
  });
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run("Math, 3"), "courses");
  throwsInput(() => run("Math, 0, A"), "courses");
  throwsInput(() => run("Math, 3, Z"), "courses");
  throwsInput(() => run("Math, 3, 4.5"), "courses");
  throwsInput(() => run("Math, x, B"), "courses");
  throwsInput(() => run("x, 3, A-", "5"), "courses");
  throwsInput(() => run(""), "courses");
  throwsInput(() => run("Math, 3, A", "4", "3", ""), "prevCredits");
});
