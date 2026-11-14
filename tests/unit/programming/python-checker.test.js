import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/python-checker.js";

const errors = (code) => mod.check(code).filter((i) => i.severity === "error");
const firstError = (code) => errors(code)[0] || null;
const all = (code) => mod.check(code);

test("المثال المحلول ورسالة الخطأ", () => {
  const r = checkExample(mod);
  assert.match(r.results[0].value, /❌ وُجد 2 خطآن/);
  const list = errors(mod.meta.example.values.code);
  assert.equal(list.length, 2);
  assert.match(list.find((i) => i.line === 1).message, /expected ':'/);
  assert.match(list.find((i) => i.line === 8).message, /«averge».*«average»/);
});

test("أخطاء تطابق رسائل مفسّر Python الحقيقي وأرقام أسطرها", () => {
  const cases = [
    ["if x > 5\n    print(x)\nx = 1", 1, /SyntaxError: expected ':'/],
    ["for i in range(3)\n    print(i)", 1, /expected ':'/],
    ["x = 5\nif x = 5:\n    print(x)", 2, /Maybe you meant '=='/],
    ["def f():\nreturn 1", 2, /expected an indented block after 'def' statement on line 1/],
    ["def f(x):\n    if x:\n    return 1", 3, /after 'if' statement on line 2/],
    ["x = 1\n    y = 2", 2, /unexpected indent/],
    ["if True:\n        a = 1\n    b = 2", 3, /unindent does not match/],
    ["while x < 3:\n    x += 1\n  print(x)\nx = 0", 3, /unindent does not match/],
    ["print \"hello\"", 1, /Missing parentheses in call to 'print'/],
    ["s = 'abc\nprint(s)", 1, /unterminated string literal/],
    ["s = '''abc\n(\n", 1, /unterminated triple-quoted/],
    ["t = (1, 2\nprint(t)", 1, /'\(' was never closed/],
    ["x = [1, 2)", 1, /does not match opening parenthesis '\['/],
    ["return 5", 1, /'return' outside function/],
    ["while True:\n    break\nbreak", 3, /'break' outside loop/],
    ["for i in range(2):\n    def g():\n        continue", 3, /'continue' outside loop/],
    ["else:\n    pass", 1, /else بلا if/],
    ["try:\n    pass", 1, /expected 'except' or 'finally' block/],
    ["try:\n    x = 1\nprint(x)", 1, /expected 'except' or 'finally'/]
  ];
  for (const [code, line, re] of cases) {
    const e = firstError(code);
    assert.ok(e, code);
    assert.equal(e.line, line, code);
    assert.match(e.message, re, code);
  }
});

test("عادات اللغات الأخرى والأخطاء الشائعة عند الطلاب", () => {
  assert.match(firstError("if a && b:\n    pass\na = b = 1").fix, /and/);
  assert.match(firstError("i = 0\ni++").fix, /\+= 1/);
  assert.match(firstError("flag = true\nprint(flag)").fix, /True/);
  assert.match(firstError("x = 1\nelse if x > 2:\n    pass").fix, /elif/);
  assert.equal(errors("x = 1\nelse if x > 2:\n    pass").length, 1);
  const brace = errors("def f() {\n    return 1\n}");
  assert.equal(brace.length, 1);
  assert.match(brace[0].fix, /def f\(\):/);
  assert.match(firstError("print('age: ' + 5)").message, /can only concatenate str/);
  assert.match(firstError("print \"hello\"").fix, /print\("hello"\)/);
  const warn = all("name = input('n: ')\nif name > 10:\n    print(name)").find((i) => i.severity === "warning");
  assert.match(warn.message, /input\(\) تعيد نصاً/);
  assert.match(all("class A:\n    def m():\n        return 1").find((i) => i.severity === "warning").message, /self/);
  assert.match(all("def f(a=[]):\n    return a").find((i) => i.severity === "warning").message, /قابلة للتعديل/);
  assert.ok(all("try:\n    x = 1\nexcept:\n    pass").some((i) => i.severity === "info" && /except:/.test(i.message)));
  assert.ok(all("x = 1\nif x == None:\n    pass").some((i) => /is None/.test(i.fix)));
  assert.equal(all("if x:\n \tpass\nx = 1").filter((i) => i.severity === "error").length, 0);
});

test("كود صحيح ومتنوع لا يعطي أي ملاحظة كاذبة", () => {
  const good = [
    "import math\nfrom os import path as p\nprint(math.sqrt(4), p)",
    "nums = [1, 2]\na, *rest = nums\ntotal: int = 0\ntotal += sum(rest)\nprint(a, total)",
    "class P:\n    @staticmethod\n    def s(x):\n        return x\n    def m(self, k=None):\n        if (n := len(k or [])) > 1:\n            return n\n        return self",
    "print(r'\\d', f'{1}', \"it's\", 'say \"hi\"', b'\\x00')",
    "try:\n    pass\nexcept (ValueError, KeyError) as e:\n    print(e)\nelse:\n    pass\nfinally:\n    pass",
    "matrix = [\n    [1, 2],\n    [3, 4],\n]\ntext = \"\"\"multi\nline ( [ {\n\"\"\"\nprint(matrix, text)",
    "long_sum = 1 + \\\n    2\nprint(long_sum)",
    "def gen(limit, *args, step=1, **kwargs):\n    i = 0\n    while i < limit:\n        yield i\n        i += step\n    for item in args:\n        if item:\n            continue\n        break\n    return kwargs",
    "async def fetch_all(urls, session):\n    async with session() as s:\n        return [await s.get(u) for u in urls]",
    "result = [i for i in range(10) if i % 2 == 0]\nsquares = {k: v * v for k, v in enumerate(result)}\nprint(result is None, squares)",
    "for i in range(3):\n    pass\nelse:\n    pass",
    "if __name__ == '__main__':\n    main = lambda q, r=2: q + r\n    print(main(1))"
  ];
  for (const g of good) assert.deepEqual(all(g), [], g);
});

test("النتائج والعرض", () => {
  const r = mod.solve({ code: "x = 1\n    y = 2" });
  assert.match(r.results[0].value, /❌/);
  assert.match(r.copy, /السطر 2/);
  const html = r.blocks.find((b) => b.type === "html").html;
  assert.ok(html.includes('<span class="bad">'));
  assert.equal(mod.solve({ code: "print('<b>')" }).results[0].value, "✅ لا توجد أخطاء");
  assert.ok(mod.solve({ code: "print('<b>')" }).blocks.find((b) => b.type === "html").html.includes("&lt;b&gt;"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ code: "" }), "code");
  throwsInput(() => mod.solve({ code: "  \n " }), "code");
  throwsInput(() => mod.solve({ code: "x".repeat(200001) }), "code");
});
