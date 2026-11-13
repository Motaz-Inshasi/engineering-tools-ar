import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/architecture/sun-position.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (r, l) => r.results.find((x) => x.label.startsWith(l)).value;
const run = (o) => mod.solve({ height: "10", ...o });

test("أوقات الشروق والغروب لمدن معروفة", () => {
  assert.equal(v(run({ lat: "24.71", lon: "46.68", date: "2026-12-21", time: "12:00", tz: "3" }), "الشروق"), "06:33 / 11:51 / 17:09");
  assert.equal(v(run({ lat: "40", lon: "-105", date: "2026-06-21", time: "12:00", tz: "-6" }), "الشروق"), "05:31 / 13:01 / 20:32");
  assert.equal(v(run({ lat: "78", lon: "15", date: "2026-12-21", time: "12:00", tz: "1" }), "الشروق"), "الشمس لا تشرق في هذا اليوم (ليل قطبي)");
  assert.equal(v(run({ lat: "78", lon: "15", date: "2026-06-21", time: "12:00", tz: "1" }), "الشروق"), "الشمس لا تغرب في هذا اليوم (نهار قطبي)");
});

test("الارتفاع الأقصى عند الزوال = 90 − |φ − δ|", () => {
  const r = run({ lat: "51.5", lon: "-0.13", date: "2026-06-21", time: "13:00", tz: "1" });
  close(parseFloat(v(r, "أقصى ارتفاع")), 90 - (51.5 - 23.44), 2e-3);
  close(parseFloat(v(r, "ارتفاع الشمس")), 61.95, 1e-3);
  const eq = run({ lat: "0", lon: "0", date: "2026-03-20", time: "12:07", tz: "0" });
  assert.ok(parseFloat(v(eq, "ارتفاع الشمس")) > 89);
});

test("طول الظل يطابق H / tan(α)", () => {
  const r = run({ lat: "30", lon: "31.2", date: "2026-09-23", time: "09:00", tz: "2" });
  const a = parseFloat(v(r, "ارتفاع الشمس"));
  close(parseFloat(v(r, "طول ظل")), 10 / Math.tan((a * Math.PI) / 180), 2e-3);
  assert.equal(v(run({ lat: "30", lon: "31.2", date: "2026-09-23", time: "23:00", tz: "2" }), "الظل"), "الشمس تحت الأفق فلا يوجد ظل.");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ lat: "95", lon: "0", date: "2026-06-21", time: "12:00", tz: "0" }), "lat");
  throwsInput(() => run({ lat: "30", lon: "0", date: "2026-02-30", time: "12:00", tz: "0" }), "date");
  throwsInput(() => run({ lat: "30", lon: "0", date: "21/06/2026", time: "12:00", tz: "0" }), "date");
  throwsInput(() => run({ lat: "30", lon: "0", date: "2026-06-21", time: "25:00", tz: "0" }), "time");
  throwsInput(() => mod.solve({ lat: "30", lon: "0", date: "2026-06-21", time: "12:00", tz: "0", height: "0" }), "height");
});
