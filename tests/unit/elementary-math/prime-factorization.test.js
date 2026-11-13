import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/elementary-math/prime-factorization.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (n) => mod.solve({ n: String(n) }).results;
const get = (n, label) => run(n).find((r) => r.label.includes(label)).value;

test("360 = 2³ × 3² × 5 مع القواسم والدوال", () => {
  assert.equal(get(360, "التحليل"), "2³ × 3² × 5");
  assert.equal(get(360, "الصيغة"), "2^{3} \\times 3^{2} \\times 5");
  assert.equal(get(360, "هل العدد"), "لا، العدد مركب");
  assert.equal(get(360, "عدد القواسم"), "24");
  assert.equal(get(360, "مجموع القواسم"), "1170");
  assert.equal(get(360, "دالة أويلر"), "96");
  assert.equal(get(360, "أقرب عدد أولي أصغر"), "359");
  assert.equal(get(360, "أقرب عدد أولي أكبر"), "367");
  const divs = get(360, "كل القواسم").split(", ").map(Number);
  assert.equal(divs.length, 24);
  assert.equal(divs[0], 1);
  assert.equal(divs[divs.length - 1], 360);
  assert.ok(divs.every((d) => 360 % d === 0));
});

test("الأعداد الأولية وحالات الحدود", () => {
  assert.equal(get(97, "هل العدد"), "نعم، العدد أولي");
  assert.equal(get(97, "مجموع القواسم"), "98");
  assert.equal(get(97, "دالة أويلر"), "96");
  assert.equal(get(97, "أقرب عدد أولي أصغر"), "89");
  assert.equal(get(97, "أقرب عدد أولي أكبر"), "101");
  assert.equal(get(2, "أقرب عدد أولي أصغر"), "لا يوجد");
  assert.equal(get(2, "أقرب عدد أولي أكبر"), "3");
  assert.equal(get(2, "دالة أويلر"), "1");
  assert.equal(get(1024, "التحليل"), "2¹⁰");
  assert.equal(get(1024, "مجموع القواسم"), "2047");
});

test("مثال كبير من مشروع أويلر 3 ضمن حد 10^15", () => {
  const n = 600851475143;
  assert.equal(get(n, "التحليل"), "71 × 839 × 1471 × 6857");
  assert.equal(get(n, "عدد القواسم"), "16");
  const phi = 70n * 838n * 1470n * 6856n;
  assert.equal(get(n, "دالة أويلر"), phi.toString());
});

test("قائمة القواسم تختفي عندما يتجاوز عددها 500", () => {
  const big = 963761198400;
  assert.equal(get(big, "عدد القواسم"), "6720");
  assert.throws(() => get(big, "كل القواسم"));
  assert.ok(get(720720, "كل القواسم").length > 0);
});

test("التحليل يضرب الأعداد العشوائية ويعيد n، ويطابق اختبار الأولية الحرفي", () => {
  const rnd = rng(3);
  const brute = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  for (let i = 0; i < 150; i++) {
    const n = 2 + Math.floor(rnd() * 200000);
    const res = mod.solve({ n: String(n) }).results;
    const isPrimeText = res[0].value.startsWith("نعم");
    assert.equal(isPrimeText, brute(n), `n=${n}`);
    const fact = res[1].value;
    const product = fact.split(" × ").reduce((acc, term) => {
      const m = term.match(/^(\d+)(.*)$/);
      const sups = { "⁰": 0, "¹": 1, "²": 2, "³": 3, "⁴": 4, "⁵": 5, "⁶": 6, "⁷": 7, "⁸": 8, "⁹": 9 };
      const e = m[2] ? Number([...m[2]].map((c) => sups[c]).join("")) : 1;
      return acc * BigInt(m[1]) ** BigInt(e);
    }, 1n);
    assert.equal(product, BigInt(n), `factor product n=${n}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ n: "1" }), "n");
  throwsInput(() => mod.solve({ n: "2.5" }), "n");
  throwsInput(() => mod.solve({ n: "1e16" }), "n");
  throwsInput(() => mod.solve({ n: "" }), "n");
});
