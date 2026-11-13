import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/computing/text-encoding.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const enc = (text) => mod.solve({ mode: "encode", text });
const dec = (mode, text) => mod.solve({ mode, text });

test("قيم معروفة: A و ب و Hello", () => {
  const a = enc("A");
  assert.equal(resultValue(a, "Unicode"), "U+0041");
  assert.equal(resultValue(a, "UTF-8"), "41");
  assert.equal(resultValue(a, "Base64"), "QQ==");
  const b = enc("ب");
  assert.equal(resultValue(b, "Unicode"), "U+0628");
  assert.equal(resultValue(b, "UTF-8"), "D8 A8");
  assert.equal(resultValue(enc("Hello"), "Base64"), "SGVsbG8=");
});

test("Base64 مطابق للمرجع المستقل (RFC 4648) وترميز URL", () => {
  assert.equal(resultValue(enc("Man"), "Base64"), "TWFu");
  assert.equal(resultValue(enc("Ma"), "Base64"), "TWE=");
  assert.equal(resultValue(enc("M"), "Base64"), "TQ==");
  const s = "مرحباً, World 😀";
  assert.equal(resultValue(enc(s), "Base64"), Buffer.from(s, "utf8").toString("base64"));
  assert.equal(resultValue(enc("ب"), "URL"), "%D8%A8");
});

test("نقطة الرمز الرباعية البايت (😀 = U+1F600 = F0 9F 98 80)", () => {
  const r = enc("😀");
  assert.equal(resultValue(r, "Unicode"), "U+1F600");
  assert.equal(resultValue(r, "UTF-8"), "F0 9F 98 80");
});

test("فك Base64 والست عشري يعيدان النص الأصلي (ذهاباً وإياباً)", () => {
  assert.equal(dec("b64decode", "SGVsbG8=").results[0].value, "Hello");
  assert.equal(dec("b64decode", "QQ==").results[0].value, "A");
  assert.equal(dec("hexdecode", "D8 A8").results[0].value, "ب");
  for (const s of ["مرحبا بالعالم", "Ünïcödé ✓ 𝄞", "a b\tc\nd"]) {
    const b64 = enc(s).results[2].value;
    assert.equal(dec("b64decode", b64).results[0].value, s);
    const hx = new TextEncoder().encode(s);
    assert.equal(enc(s).results[1].value, Array.from(hx, (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" "));
  }
});

test("جدول الأحرف: حد 200 صف وتحذير عند الزيادة", () => {
  const long = mod.solve({ mode: "encode", text: "a".repeat(250) });
  const table = long.blocks.find((b) => b.type === "table");
  assert.equal(table.rows.length, 200);
  assert.ok(long.blocks.some((b) => b.type === "note"));
  assert.equal(table.ltr, true);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "b64decode", text: "SGVsbG8" }), "text");
  throwsInput(() => mod.solve({ mode: "b64decode", text: "SG!s" }), "text");
  throwsInput(() => mod.solve({ mode: "b64decode", text: "/w==" }), "text");
  throwsInput(() => mod.solve({ mode: "hexdecode", text: "414" }), "text");
  throwsInput(() => mod.solve({ mode: "hexdecode", text: "4G" }), "text");
  throwsInput(() => mod.solve({ mode: "encode", text: "" }), "text");
  throwsInput(() => mod.solve({ mode: "encode", text: "a".repeat(2001) }), "text");
  throwsInput(() => mod.solve({ mode: "xyz", text: "A" }), "mode");
});
