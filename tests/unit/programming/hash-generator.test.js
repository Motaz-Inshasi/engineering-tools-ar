import { test } from "node:test";
import { createHash } from "node:crypto";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/hash-generator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const digest = (text, algo = "all") => mod.solve({ text, algo });
const hexOf = (text, label) => resultValue(digest(text), label);

test("متجهات اختبار معروفة", () => {
  assert.equal(hexOf("", "MD5"), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(hexOf("abc", "MD5"), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(hexOf("abc", "SHA-1"), "a9993e364706816aba3e25717850c26c9cd0d89d");
  assert.equal(hexOf("abc", "SHA-256"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hexOf("", "SHA-256"), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("مطابقة node:crypto للنص العربي وأطوال الحشو والنص الطويل", () => {
  const mixed = Array.from({ length: 1000 }, (_, i) => (i % 3 === 0 ? "م" : String.fromCharCode(97 + (i % 26)))).join("");
  const lengths = [0, 1, 55, 56, 63, 64, 65, 119, 120];
  const samples = ["مرحبا بالعالم", mixed, ...lengths.map((n) => "a".repeat(n))];
  for (const text of samples) {
    for (const [label, alg] of [["MD5", "md5"], ["SHA-1", "sha1"], ["SHA-256", "sha256"]]) {
      const expected = createHash(alg).update(Buffer.from(text, "utf8")).digest("hex");
      assert.equal(hexOf(text, label), expected, `${alg} for ${Buffer.byteLength(text)} bytes`);
    }
  }
});

test("عدد الكتل بعد الحشو حسب حالات الحافة", () => {
  const blocks = (n) => Number.parseInt(resultValue(digest("a".repeat(n)), "عدد الكتل"), 10);
  assert.equal(blocks(55), 1);
  assert.equal(blocks(56), 2);
  assert.equal(blocks(63), 2);
  assert.equal(blocks(64), 2);
  assert.equal(blocks(119), 2);
  assert.equal(blocks(120), 3);
});

test("طول البايتات بترميز UTF-8 للنص العربي", () => {
  assert.equal(resultValue(digest("مرحبا بالعالم"), "طول النص"), "25 بايت");
  assert.equal(Number.parseInt(resultValue(digest("مرحبا بالعالم"), "طول النص"), 10), 25);
});

test("النص الفارغ مقبول واختيار خوارزمية واحدة يعرض نتيجة واحدة", () => {
  const res = mod.solve({ algo: "md5" });
  const hashes = res.results.filter((r) => /MD5|SHA/.test(r.label));
  assert.equal(hashes.length, 1);
  assert.equal(hashes[0].value, "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(res.copy, "MD5: d41d8cd98f00b204e9800998ecf8427e");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ text: "x".repeat(200001), algo: "all" }), "text");
  throwsInput(() => mod.solve({ text: "abc", algo: "sha512" }), "algo");
});
