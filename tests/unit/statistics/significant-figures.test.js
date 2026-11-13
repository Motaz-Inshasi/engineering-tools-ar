import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/statistics/significant-figures.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const count = (value) => mod.solve({ mode: "count", value }).results[0].value;
const round = (value, sf) => mod.solve({ mode: "round", value, sf }).results[0].value;
const prop = (v) => mod.solve({ mode: "prop", ...v }).results[0].value;

test("عدّ الأرقام المعنوية حسب القواعد", () => {
  assert.equal(count("1200"), "رقمان معنويان");
  assert.equal(count("1200."), "4 أرقام معنوية");
  assert.equal(count("1.20e3"), "3 أرقام معنوية");
  assert.equal(count("30.05"), "4 أرقام معنوية");
  assert.equal(count("0.1"), "رقم معنوي واحد");
  assert.equal(count("-0.00720"), "3 أرقام معنوية");
  assert.equal(count("٠٫٠٥٠"), "رقمان معنويان");
});

test("التقريب", () => {
  assert.equal(round("3.14159", "3"), "3.14");
  assert.equal(round("0.004567", "2"), "0.0046");
  assert.equal(round("123456", "2"), "1.2 × 10^5");
  assert.equal(round("9.996", "3"), "10.0");
  assert.equal(round("2.5", "1"), "3");
});

test("انتشار الخطأ", () => {
  assert.equal(prop({ op: "mul", a: "4.52", da: "0.02", b: "2.0", db: "0.2" }), "9.0 ± 0.9");
  assert.equal(prop({ op: "add", a: "10.3", da: "0.3", b: "5.2", db: "0.4" }), "15.5 ± 0.5");
  assert.equal(prop({ op: "sub", a: "10.3", da: "0.3", b: "5.2", db: "0.4" }), "5.1 ± 0.5");
  assert.equal(prop({ op: "pow", a: "2.0", da: "0.1", power: "3" }), "8.0 ± 1.2");
  assert.equal(prop({ op: "div", a: "100", da: "1", b: "4", db: "0" }), "25.0 ± 0.3");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "count", value: "0" }), "value");
  throwsInput(() => mod.solve({ mode: "count", value: "1.2.3" }), "value");
  throwsInput(() => mod.solve({ mode: "round", value: "12", sf: "0" }), "sf");
  throwsInput(() => mod.solve({ mode: "prop", op: "div", a: "1", da: "0.1", b: "0", db: "0.1" }), "b");
  throwsInput(() => mod.solve({ mode: "prop", op: "add", a: "1", da: "-0.1", b: "2", db: "0.1" }), "da");
});
