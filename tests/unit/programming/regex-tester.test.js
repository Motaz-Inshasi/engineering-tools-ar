import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/regex-tester.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("\\d+ على نص مختلط: ثلاث مطابقات بمواضع معروفة", () => {
  const { list, truncated } = mod.findMatches(new RegExp("\\d+", "g"), "a1b22c333");
  assert.deepEqual(list.map((m) => m.text), ["1", "22", "333"]);
  assert.deepEqual(list.map((m) => m.index), [1, 3, 6]);
  assert.equal(truncated, false);
});

test("بدون علم g تُعرض أول مطابقة فقط", () => {
  const { list } = mod.findMatches(new RegExp("\\d+"), "a1b22c333");
  assert.deepEqual(list.map((m) => m.text), ["1"]);
});

test("علم i يتجاهل حالة الأحرف", () => {
  assert.equal(mod.findMatches(new RegExp("abc", "gi"), "ABC abc Abc").list.length, 3);
  assert.equal(mod.findMatches(new RegExp("abc", "g"), "ABC abc Abc").list.length, 1);
});

test("المجموعات المسماة والمرقمة", () => {
  const { list } = mod.findMatches(new RegExp("(?<y>\\d{4})-(?<m>\\d{2})", "g"), "2024-05");
  assert.equal(list.length, 1);
  assert.equal(list[0].named.y, "2024");
  assert.equal(list[0].named.m, "05");
  assert.deepEqual(list[0].groups, ["2024", "05"]);
});

test("النمط الفارغ و\\b لا يعلّقان البحث ويعدّان الصحيح", () => {
  assert.equal(mod.findMatches(new RegExp("", "g"), "abc").list.length, 4);
  assert.deepEqual(mod.findMatches(new RegExp("\\b", "g"), "hi there").list.map((m) => m.index), [0, 2, 3, 8]);
});

test("الاستبدال بأرقام المجموعات", () => {
  const a = mod.analyze({ pattern: "(\\w+)@(\\w+)", flags: "g", text: "alice@home bob@work", replace: "$2 at $1" });
  assert.equal(a.replaced, "home at alice work at bob");
});

test("ترميز HTML للنص مع تمييز المطابقات", () => {
  const res = mod.solve({ pattern: "b", flags: "g", text: "<b>&", replace: "" });
  const html = res.blocks.find((b) => b.type === "html" && b.html.includes("mark")).html;
  assert.ok(html.includes('&lt;<span class="mark">b</span>&gt;&amp;'));
  assert.ok(!html.includes("<b>"));
});

test("الحد الأقصى للمطابقات 500 ولا تتوقف الحلقة", () => {
  const { list, truncated } = mod.findMatches(new RegExp("a", "g"), "a".repeat(600));
  assert.equal(list.length, 500);
  assert.equal(truncated, true);
});

test("الصيغة الكاملة /نمط/أعلام تُفكَّك", () => {
  const a = mod.analyze({ pattern: "/ab/gi", flags: "", text: "AB ab" });
  assert.equal(a.flags, "gi");
  assert.equal(a.matches.length, 2);
});

test("شرح الرموز: المجموعة المسماة والتكرار", () => {
  const rows = mod.explain("(?<y>\\d{4})");
  assert.ok(rows[0][1].includes("«y»"));
  assert.deepEqual(rows[1][0], "\\d");
  assert.equal(rows[2][0], "{4}");
  assert.ok(rows[2][1].includes("بالضبط 4 مرة"));
});

test("أخطاء الإدخال تُنسب إلى الحقل الصحيح", () => {
  throwsInput(() => mod.solve({ pattern: "(", flags: "g", text: "abc", replace: "" }), "pattern");
  throwsInput(() => mod.solve({ pattern: "a", flags: "gg", text: "abc", replace: "" }), "flags");
  throwsInput(() => mod.solve({ pattern: "a", flags: "x", text: "abc", replace: "" }), "flags");
  throwsInput(() => mod.solve({ pattern: "a", flags: "g", text: "a".repeat(200001), replace: "" }), "text");
});
