import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/student/word-counter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const count = (text, readWpm = "200", speakWpm = "130") => mod.solve({ text, readWpm, speakWpm });

test("جملتان إنجليزيتان بقيم محسوبة يدوياً", () => {
  const v = count("Hello world. This is a test.").values;
  assert.equal(v.W, 6);
  assert.equal(v.chars, 28);
  assert.equal(v.charsNoSpace, 23);
  assert.equal(v.sentences, 2);
  assert.equal(v.paragraphs, 1);
  assert.equal(v.latin, 21);
  assert.equal(v.digits, 0);
  close(v.avgLen, 3.5, 1e-9);
});

test("زمن القراءة والإلقاء لـ 200 كلمة", () => {
  const res = count(Array(200).fill("كلمة").join(" "));
  close(res.values.readSec, 60, 1e-9);
  close(res.values.speakSec, (200 / 130) * 60, 1e-9);
  assert.equal(res.results.find((r) => r.label.startsWith("زمن القراءة")).value, "1:00");
  assert.equal(res.results.find((r) => r.label.startsWith("زمن الإلقاء")).value, "1:32");
});

test("الحروف العربية والأرقام والفقرات والجمل", () => {
  const a = count("كلمة 2024").values;
  assert.equal(a.arabic, 4);
  assert.equal(a.digits, 4);
  const b = count("أ\n\nب\n\nج").values;
  assert.equal(b.paragraphs, 3);
  assert.equal(b.sentences, 3);
});

test("أكثر الكلمات تكراراً مع إزالة الترقيم والتشكيل", () => {
  const top = count("The the THE cat, cat! dog.").values.top;
  assert.deepEqual(top[0], ["the", 3]);
  assert.deepEqual(top[1], ["cat", 2]);
  assert.deepEqual(count("كَلِمَة كلمة is a").values.top[0], ["كلمة", 2]);
  assert.equal(count("is a an").values.top.length, 0);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => count("   "), "text");
  throwsInput(() => count("", "200", "130"), "text");
  throwsInput(() => count("كلمة", "0"), "readWpm");
  throwsInput(() => count("كلمة", "200", "abc"), "speakWpm");
});
