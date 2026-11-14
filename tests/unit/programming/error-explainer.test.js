import { test } from "node:test";
import { assert, checkExample, rng, throwsInput } from "../helpers.js";
import * as mod from "../../../lib/programming/error-explainer.js";
import { ERROR_DB } from "../../../lib/programming/error-db.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const entry = (id) => {
  const e = ERROR_DB.find((x) => x.id === id);
  assert.ok(e, `unknown entry ${id}`);
  return e;
};
const run = (text, lang = "auto") => mod.solve({ text, lang });
const valueOf = (res, label) => {
  const r = res.results.find((x) => x.label.startsWith(label));
  return r ? r.value : undefined;
};
const expectEntry = (text, id, lang = "auto") => {
  const res = run(text, lang);
  assert.equal(valueOf(res, "الخطأ"), entry(id).title, `${id} for: ${text}`);
  return res;
};

test("أخطاء Python الحقيقية", () => {
  const traceback = "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined";
  const res = expectEntry(traceback, "py-name-error");
  assert.ok(valueOf(res, "المعنى").includes("totl"));
  assert.equal(valueOf(res, "الموقع"), "السطر 5 في الملف main.py");
  expectEntry("Traceback (most recent call last):\n  File \"app.py\", line 2, in <module>\nValueError: invalid literal for int() with base 10: 'abc'", "py-int-literal");
  expectEntry("  File \"app.py\", line 2\n    print(x)\n    ^\nIndentationError: expected an indented block after 'if' statement on line 1", "py-indent-expected");
  expectEntry("ModuleNotFoundError: No module named 'pandas'", "py-module-not-found");
  expectEntry("TypeError: can only concatenate str (not \"int\") to str", "py-concat-str-int");
  expectEntry("IndexError: list index out of range", "py-index-out-of-range");
  expectEntry("TypeError: greet() missing 1 required positional argument: 'name'", "py-missing-arg");
});

test("أخطاء JavaScript و Node.js", () => {
  const res = expectEntry("TypeError: Cannot read properties of undefined (reading 'length')\n    at main (/app/app.js:3:15)", "js-read-props");
  assert.ok(valueOf(res, "المعنى").includes("length"));
  assert.equal(valueOf(res, "الموقع"), "السطر 3، العمود 15 في الملف /app/app.js");
  expectEntry("Uncaught ReferenceError: totl is not defined", "js-ref-not-defined");
  expectEntry("SyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON", "js-json-unexpected-token");
  expectEntry("Uncaught TypeError: x is not a function", "js-not-function");
  expectEntry("Error: Cannot find module './utils'", "js-cannot-find-module");
});

test("أخطاء Java", () => {
  const javac = "Main.java:5: error: cannot find symbol\n        System.out.println(x);\n                           ^\n  symbol:   variable x\n  location: class Main";
  const res = expectEntry(javac, "java-cannot-find-symbol");
  assert.equal(valueOf(res, "الموقع"), "السطر 5 في الملف Main.java");
  expectEntry("Main.java:4: error: incompatible types: possible lossy conversion from double to int", "java-lossy-conversion");
  expectEntry("Main.java:4: error: incompatible types: String cannot be converted to int", "java-incompatible-types");
  const aioobe = expectEntry("Exception in thread \"main\" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat Main.main(Main.java:4)", "java-array-index");
  assert.ok(valueOf(aioobe, "المعنى").includes("3"));
  expectEntry("Exception in thread \"main\" java.lang.NullPointerException\n\tat Main.main(Main.java:6)", "java-npe");
});

test("أخطاء C و C++", () => {
  const gcc = "main.c:3:5: error: expected ';' before 'return'\n    3 |     return 0;\n      |     ^~~~~~";
  const res = expectEntry(gcc, "cpp-expected-before");
  assert.equal(valueOf(res, "الموقع"), "السطر 3، العمود 5 في الملف main.c");
  expectEntry("main.c:4:12: error: 'x' was not declared in this scope", "cpp-not-declared");
  const link = expectEntry("/usr/bin/ld: main.o: in function `main':\nmain.c:(.text+0x15): undefined reference to `hi'\ncollect2: error: ld returned 1 exit status", "cpp-undefined-reference");
  assert.ok(valueOf(link, "المعنى").includes("hi"));
  expectEntry("Segmentation fault (core dumped)", "cpp-segfault");
});

test("أخطاء C#", () => {
  const res = expectEntry("Program.cs(12,5): error CS0103: The name 'x' does not exist in the current context", "cs-0103");
  assert.equal(valueOf(res, "الموقع"), "السطر 12، العمود 5 في الملف Program.cs");
  assert.ok(valueOf(res, "المعنى").includes("x"));
  expectEntry("Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.", "cs-nullref");
  expectEntry("error CS1002: ; expected", "cs-1002");
  expectEntry("Program.cs(7,9): error CS0029: Cannot implicitly convert type 'string' to 'int'", "cs-0029");
});

test("رسائل متعددة تُشرح كلها", () => {
  const res = run("main.c:3:5: error: expected ';' before 'return'\nmain.c:7:1: error: 'x' was not declared in this scope");
  const titles = res.results.filter((r) => r.label.startsWith("الخطأ"));
  assert.equal(titles.length, 2);
  assert.equal(titles[0].label, "الخطأ 1");
  assert.equal(titles[0].value, entry("cpp-expected-before").title);
  assert.equal(titles[1].value, entry("cpp-not-declared").title);
});

test("رسالة غير معروفة لا تُعتبر خطأ إدخال", () => {
  const res = run("Hello world, this is a normal sentence.");
  assert.equal(valueOf(res, "الحكم"), "لم نتعرف على هذه الرسالة");
  assert.ok(res.steps.length > 0);
  const mismatch = run("NameError: name 'totl' is not defined", "java");
  assert.equal(valueOf(mismatch, "الحكم"), "لم نتعرف على هذه الرسالة");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ text: "   ", lang: "auto" }), "text");
  throwsInput(() => mod.solve({ text: "a".repeat(200001), lang: "auto" }), "text");
  throwsInput(() => mod.solve({ text: "NameError: x", lang: "ruby" }), "lang");
});

test("الترميز الآمن لكود HTML", () => {
  const res = run("fatal error: myheader.h: No such file or directory");
  assert.equal(valueOf(res, "الخطأ"), entry("cpp-no-such-file").title);
  const html = res.blocks.find((b) => b.type === "html").html;
  assert.ok(html.includes("&lt;myheader.h&gt;"));
  assert.ok(!html.includes("<myheader"));
});

test("أداء النص الكبير", () => {
  const r = rng(7);
  const alphabet = "abcdefghijklmnopqrstuvwxyz ()'\"\n:.,-_0123456789<>";
  let s = "";
  for (let i = 0; i < 50000; i++) s += alphabet[Math.floor(r() * alphabet.length)];
  const t0 = Date.now();
  const res = mod.solve({ text: s, lang: "auto" });
  assert.ok(Date.now() - t0 < 1000, `took ${Date.now() - t0} ms`);
  assert.ok(res.results.length > 0);
});

test("لا يوجد تراجع كارثي في الأنماط", () => {
  const evil = [
    "a".repeat(20000),
    " ".repeat(20000),
    "'".repeat(20000),
    "(".repeat(20000),
    "error: expected ".repeat(1500),
    "File \"" + "a".repeat(20000),
    "Index " + "1 ".repeat(5000),
    "x.js:" + "1".repeat(20000),
    "a.".repeat(10000) + "js:1"
  ];
  const t0 = Date.now();
  for (const text of evil) {
    for (const e of ERROR_DB) e.pattern.exec(text);
  }
  assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
});

test("قاعدة البيانات مكتملة وصالحة", () => {
  assert.ok(ERROR_DB.length >= 110, `only ${ERROR_DB.length} entries`);
  const counts = {};
  for (const e of ERROR_DB) counts[e.lang] = (counts[e.lang] || 0) + 1;
  assert.ok(counts.python >= 35);
  assert.ok(counts.javascript >= 25);
  assert.ok(counts.java >= 22);
  assert.ok(counts.cpp >= 20);
  assert.ok(counts.csharp >= 12);
  const ids = new Set();
  for (const e of ERROR_DB) {
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
    assert.ok(["python", "javascript", "java", "cpp", "csharp"].includes(e.lang), e.id);
    assert.ok(e.pattern instanceof RegExp, `${e.id} pattern`);
    assert.doesNotThrow(() => new RegExp(e.pattern.source, e.pattern.flags), e.id);
    for (const f of ["title", "explain", "bad", "good"]) assert.ok(typeof e[f] === "string" && e[f].trim() !== "", `${e.id}.${f}`);
    for (const f of ["causes", "fixes"]) {
      assert.ok(Array.isArray(e[f]) && e[f].length > 0, `${e.id}.${f}`);
      for (const t of e[f]) assert.ok(typeof t === "string" && t.trim() !== "", `${e.id}.${f} item`);
    }
    assert.notEqual(e.bad, e.good, `${e.id} bad and good must differ`);
    const groups = [...e.pattern.source.matchAll(/\(\?<([A-Za-z]\w*)>/g)].map((m) => m[1]);
    const texts = [e.title, e.explain, ...e.causes, ...e.fixes];
    for (const t of texts) {
      for (const m of t.matchAll(/\{(\w+)\}/g)) assert.ok(groups.includes(m[1]), `${e.id} placeholder {${m[1]}} not a group`);
    }
  }
});
