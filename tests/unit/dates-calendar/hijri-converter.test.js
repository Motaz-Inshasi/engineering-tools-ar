import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/dates-calendar/hijri-converter.js";
import { toHijri, fromHijri, DAY } from "../../../lib/dates-calendar/calendar.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("مناسبات معروفة وفق أم القرى", () => {
  assert.equal(mod.solve({ dir: "h2g", hy: "1445", hm: "12", hd: "10" }).copy, "10 ذو الحجة 1445هـ = الأحد 16 يونيو 2024م");
  assert.equal(mod.solve({ dir: "h2g", hy: "1446", hm: "9", hd: "1" }).copy, "1 رمضان 1446هـ = السبت 1 مارس 2025م");
  assert.equal(mod.solve({ dir: "g2h", gdate: "2026-11-13" }).copy, "3 جمادى الآخرة 1448هـ = الجمعة 13 نوفمبر 2026م");
  assert.equal(mod.solve({ dir: "g2h", gdate: "13/11/2026" }).results[0].value, "3 جمادى الآخرة 1448هـ");
});

test("التحويل ذهاباً وإياباً متطابق لكل الأيام", () => {
  for (let t = Date.UTC(1883, 0, 1); t < Date.UTC(2170, 0, 1); t += 11 * DAY) {
    const h = toHijri(t);
    assert.equal(fromHijri(h.y, h.m, h.d), t);
  }
});

test("جدول الشهر يحتوي عدد أيامه", () => {
  const r = mod.solve({ dir: "h2g", hy: "1447", hm: "9", hd: "15" });
  assert.ok([29, 30].includes(r.blocks[0].rows.length));
  assert.equal(r.blocks[0].rows[14][2], "◀");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ dir: "g2h", gdate: "2026-02-30" }), "gdate");
  throwsInput(() => mod.solve({ dir: "g2h", gdate: "1700-01-01" }), "gdate");
  throwsInput(() => mod.solve({ dir: "h2g", hy: "1200", hm: "1", hd: "1" }), "hy");
  throwsInput(() => mod.solve({ dir: "h2g", hy: "1447", hm: "9", hd: "0" }), "hd");
});
