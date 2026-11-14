import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue, rng } from "../helpers.js";
import * as mod from "../../../lib/programming/unix-timestamp.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const fromTs = (ts, tz = "+0", unit = "auto") => mod.solve({ mode: "toDate", ts: String(ts), unit, date: "", tz });
const toTs = (date, tz = "+0") => mod.solve({ mode: "toTs", ts: "", unit: "auto", date, tz });

test("الصفر والطوابع المعروفة", () => {
  assert.equal(resultValue(fromTs(0), "ISO"), "1970-01-01T00:00:00Z");
  assert.equal(resultValue(fromTs(0), "يوم"), "الخميس");
  assert.equal(resultValue(fromTs(1700000000), "ISO"), "2023-11-14T22:13:20Z");
  assert.equal(resultValue(fromTs(1700000000), "يوم"), "الثلاثاء");
  assert.equal(resultValue(fromTs(2147483647), "ISO"), "2038-01-19T03:14:07Z");
  assert.equal(resultValue(fromTs(-86400), "التاريخ"), "1969-12-31 00:00:00 (UTC+0)");
});

test("الملي ثانية تُكتشف تلقائياً وتطابق الثواني", () => {
  assert.equal(resultValue(fromTs(1700000000000), "ISO"), "2023-11-14T22:13:20Z");
  assert.equal(resultValue(fromTs(1700000000123), "ISO"), "2023-11-14T22:13:20.123Z");
  assert.equal(resultValue(fromTs(1700000000, "+0", "s"), "ISO"), "2023-11-14T22:13:20Z");
  assert.equal(resultValue(fromTs(1700000000000, "+0", "ms"), "ISO"), "2023-11-14T22:13:20Z");
});

test("التاريخ إلى الطابع الزمني بالمنطقة الزمنية", () => {
  assert.equal(resultValue(toTs("2000-01-01 00:00:00", "+0"), "الثواني"), "946684800");
  assert.equal(resultValue(toTs("2000-01-01 00:00:00", "+3"), "الثواني"), "946674000");
  assert.equal(resultValue(toTs("2000-01-01 00:00:00", "+5.75"), "الثواني"), "946664100");
  assert.equal(resultValue(toTs("2000-01-01", "+0"), "الثواني"), "946684800");
});

test("المنطقة +5.75 تُعرض بصيغة UTC+5:45", () => {
  const res = fromTs(946664100, "+5.75");
  assert.equal(resultValue(res, "التاريخ"), "2000-01-01 00:00:00 (UTC+5:45)");
});

test("السنوات الكبيسة", () => {
  assert.equal(resultValue(toTs("2024-02-29", "+0"), "الثواني"), "1709164800");
  throwsInput(() => toTs("2023-02-29", "+0"), "date");
});

test("ذهاب وإياب بين الطابع والتاريخ المحلي", () => {
  const rand = rng(777);
  for (let i = 0; i < 200; i++) {
    const ts = Math.floor(-2e10 + rand() * 2.5e11);
    const tz = ["+5.5", "-8", "+0", "+14", "-12", "+9.5"][i % 6];
    const local = resultValue(fromTs(ts, tz, "s"), "التاريخ");
    const back = resultValue(toTs(local.replace(/ \(.*\)$/, ""), tz), "الثواني");
    assert.equal(Number(back), ts, `${ts} ${tz} ${local}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => toTs("2024-02-30", "+3"), "date");
  throwsInput(() => toTs("2024-13-01", "+3"), "date");
  throwsInput(() => toTs("2024-01-01 24:00:00", "+3"), "date");
  throwsInput(() => toTs("abc", "+3"), "date");
  throwsInput(() => mod.solve({ mode: "toDate", ts: "1.5", unit: "auto", date: "", tz: "+0" }), "ts");
  throwsInput(() => mod.solve({ mode: "toDate", ts: "", unit: "auto", date: "", tz: "+0" }), "ts");
  throwsInput(() => mod.solve({ mode: "toDate", ts: "1700000000000", unit: "s", date: "", tz: "+0" }), "ts");
});
