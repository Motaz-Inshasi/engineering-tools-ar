import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/kinematics.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (v0, v, a, t, x) => mod.solve({ v0, v, a, t, x }).values;

test("سقوط حر من السكون لمدة 3 ثوانٍ", () => {
  const r = run("0", "", "9.81", "3", "");
  close(r.v, 29.43, 1e-9);
  close(r.x, 44.145, 1e-9);
});

test("الحالة العكسية تعيد الزمن والإزاحة", () => {
  const r = run("0", "29.43", "9.81", "", "");
  close(r.t, 3, 1e-9);
  close(r.x, 44.145, 1e-9);
});

test("التربيعية تختار أصغر جذر موجب", () => {
  const r = run("10", "", "-2", "", "9");
  close(r.t, 1, 1e-9);
  close(r.v, 8, 1e-9);
});

test("الحالة الخطية عند a = 0", () => {
  const r = run("5", "", "0", "", "20");
  close(r.t, 4, 1e-9);
  close(r.v, 5, 1e-9);
});

test("تباطؤ حتى التوقف", () => {
  const r = run("20", "0", "-10", "", "");
  close(r.t, 2, 1e-9);
  close(r.x, 20, 1e-9);
});

test("حالات v و t و x تعيد v0 والتسارع", () => {
  const r = run("", "8", "", "1", "9");
  close(r.v0, 10, 1e-9);
  close(r.a, -2, 1e-9);
  const q = run("10", "", "-2", "1", "");
  close(q.v, 8, 1e-9);
  close(q.x, 9, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run("0", "", "9.81", "", ""), "v");
  throwsInput(() => run("5", "10", "2", "3", ""), "t");
  throwsInput(() => run("0", "5", "0", "", ""), "v");
  throwsInput(() => run("3", "3", "0", "", ""), "a");
  throwsInput(() => run("0", "-5", "5", "", ""), "a");
  throwsInput(() => run("0", "", "1", "-2", ""), "t");
});
