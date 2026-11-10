import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { isolateLtr } from "../../scripts/site-parts.mjs";
import { read, ROOT } from "./helpers.js";

test("الأمثلة الإنجليزية داخل النص العربي تُعزل باتجاه من اليسار لليمين", () => {
  assert.equal(isolateLtr("معادلة مثل 2x^3 = 8x."), 'معادلة مثل <bdi dir="ltr">2x^3 = 8x</bdi>.');
  assert.equal(isolateLtr("أو (x-1)(x+2)^3، أو"), 'أو <bdi dir="ltr">(x-1)(x+2)^3</bdi>، أو');
  assert.equal(isolateLtr("مثل 1 -6 11 -6."), 'مثل <bdi dir="ltr">1 -6 11 -6</bdi>.');
  assert.equal(isolateLtr("نص عربي فقط"), "نص عربي فقط");
  assert.equal(isolateLtr(""), "");
});

test("النص يُهرَّب بأمان قبل العزل ولا تُكسر الكيانات", () => {
  assert.equal(isolateLtr("A & B <x>"), '<bdi dir="ltr">A</bdi> &amp; <bdi dir="ltr">B</bdi> &lt;<bdi dir="ltr">x</bdi>&gt;');
  assert.ok(!isolateLtr('قيمة "x"').includes('"x"'));
  assert.ok(!/&[a-z]*<bdi/.test(isolateLtr("x & y ' z")));
});

test("صفحة جذور كثيرات الحدود تعرض المثال معزولاً بالاتجاه الصحيح", () => {
  const html = read(join(ROOT, "tools", "polynomial-roots", "index.html"));
  assert.ok(html.includes('<bdi dir="ltr">2x^3 = 8x</bdi>'));
  assert.ok(html.includes('<bdi dir="ltr">x^7 - x^5</bdi>'));
});
