import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/chmod-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (perm, file = "script.sh") => mod.solve({ perm, file });
const octal = (perm) => resultValue(run(perm), "الصيغة الثمانية");
const sym = (perm) => resultValue(run(perm), "الصيغة الرمزية");

test("تحويل الصيغة الثمانية إلى الرمزية", () => {
  assert.equal(sym("755"), "rwxr-xr-x");
  assert.equal(sym("644"), "rw-r--r--");
  assert.equal(sym("4755"), "rwsr-xr-x");
  assert.equal(sym("1777"), "rwxrwxrwt");
  assert.equal(sym("2750"), "rwxr-s---");
  assert.equal(sym("4644"), "rwSr--r--");
});

test("تحويل الصيغة الرمزية إلى الثمانية", () => {
  assert.equal(octal("rwxr-xr-x"), "755");
  assert.equal(octal("-rwxr-xr-x"), "755");
  assert.equal(octal("rw-r--r--"), "644");
  assert.equal(octal("rwsr-xr-x"), "4755");
  assert.equal(octal("rwxrwxrwt"), "1777");
  assert.equal(octal("rwxr-s---"), "2750");
  assert.equal(octal("rwSr--r--"), "4644");
  assert.equal(octal("0755"), "755");
});

test("ذهاب وإياب على كل الصيغ الثمانية الممكنة", () => {
  for (let mode = 0; mode <= 0o7777; mode++) {
    const perm = mode.toString(8).padStart(3, "0");
    const back = octal(sym(perm));
    assert.equal(parseInt(back, 8), mode, `mode ${perm} -> ${sym(perm)} -> ${back}`);
  }
});

test("أمر chmod وتنبيهات الأمان", () => {
  assert.equal(resultValue(run("755", "script.sh"), "أمر chmod"), "chmod 755 script.sh");
  const warnTexts = (perm) => run(perm).blocks.filter((b) => b.type === "note" && b.tone === "warn").map((b) => b.text);
  assert.equal(warnTexts("777").length, 1);
  assert.equal(warnTexts("646").length, 1);
  assert.equal(warnTexts("755").length, 0);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ perm: "789", file: "script.sh" }), "perm");
  throwsInput(() => mod.solve({ perm: "rwxr-x", file: "script.sh" }), "perm");
  throwsInput(() => mod.solve({ perm: "", file: "script.sh" }), "perm");
  throwsInput(() => mod.solve({ perm: "755", file: "a'b" }), "file");
});
