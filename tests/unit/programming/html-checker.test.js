import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/html-checker.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const check = (text) => mod.solve({ text });
const counts = (text) => {
  const res = check(text);
  const table = res.blocks.find((b) => b.type === "table");
  const rows = table ? table.rows : [];
  return {
    errors: rows.filter((r) => r[1] === "خطأ").length,
    warnings: rows.filter((r) => r[1] === "تحذير").length,
    rows,
    verdict: res.results[0].value
  };
};

test("الوسوم الاختيارية الإغلاق لا تسبب أخطاء", () => {
  assert.equal(counts("<ul><li>a<li>b</ul>").errors, 0);
  assert.equal(counts("<table><tr><td>1<td>2<tr><td>3</table>").errors, 0);
  assert.equal(counts("<dl><dt>a<dd>b</dl>").errors, 0);
  assert.equal(counts("<p>a<p>b").errors, 0);
  assert.equal(check("<ul><li>a<li>b</ul>").results[0].value, "✅ لا توجد أخطاء");
});

test("الإغلاق الخاطئ والإغلاق بلا فتح", () => {
  const mismatch = counts("<div><span></div>");
  assert.equal(mismatch.errors, 1);
  assert.ok(mismatch.rows[0][2].includes("</span>"), mismatch.rows[0][2]);
  assert.equal(mismatch.rows[0][0], "1");
  assert.equal(counts("</p>").errors, 1);
  assert.equal(counts("<div></div></div>").errors, 1);
  assert.equal(counts("<div><p>x").errors, 1);
});

test("وسوم الإغلاق للعناصر الفارغة", () => {
  const r = counts("<br></br>");
  assert.equal(r.errors, 1);
  assert.ok(r.rows[0][2].includes("br"));
});

test("المعرّفات والسمات المكررة", () => {
  const dupId = counts('<div id="a"></div>\n<p id="a">x</p>');
  assert.equal(dupId.errors, 1);
  assert.equal(dupId.rows[0][0], "2");
  assert.equal(counts('<a href="x" href="y">z</a>').errors, 1);
  assert.equal(counts('<a href=a"b>x</a>').errors, 1);
});

test("التحذيرات: الصور بلا alt والفقرة التي تحوي كتلة", () => {
  const img = counts('<img src="a.png">');
  assert.equal(img.errors, 0);
  assert.equal(img.warnings, 1);
  assert.equal(img.verdict, "✅ لا توجد أخطاء");
  const block = counts("<p><div></div></p>");
  assert.equal(block.errors, 0);
  assert.equal(block.warnings, 1);
});

test("الروابط المتداخلة والتعليق غير المغلق", () => {
  assert.equal(counts('<a href="#"><a href="#">x</a></a>').errors, 1);
  const comment = counts("<!-- abc");
  assert.equal(comment.errors, 1);
  assert.ok(comment.rows[0][2].includes("-->"));
});

test("النص البرمجي الخام والصفحة الكاملة", () => {
  assert.equal(counts('<script>if (a<b && "</div>") {}</script>').errors, 0);
  const full = counts("<html><head><title>x</title></head><body></body></html>");
  assert.equal(full.errors, 0);
  assert.equal(full.warnings, 2);
});

test("الإدخال الفارغ", () => {
  throwsInput(() => mod.solve({ text: "   " }), "text");
  throwsInput(() => mod.solve({ text: "a".repeat(200001) }), "text");
});
