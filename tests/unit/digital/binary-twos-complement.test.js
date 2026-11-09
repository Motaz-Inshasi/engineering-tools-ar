import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/digital/binary-twos-complement.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (mode, x, N) => mod.solve({ mode, x, N }).results;

test("قيم معروفة", () => {
  assert.equal(R("dec", "-1", "8")[0].text, "11111111");
  assert.equal(R("dec", "-128", "8")[0].text, "10000000");
  assert.equal(R("dec", "127", "8")[1].text, "0x7F");
  assert.equal(R("bin", "1000", "4")[2].value, "-8");
  assert.equal(R("bin", "1111", "4")[4].value, "-0");
  assert.equal(R("hex", "FFFF", "16")[2].value, "-1");
  assert.equal(R("dec", "-9223372036854775808", "64")[1].text, "0x8000000000000000");
  assert.equal(R("dec", "0", "4")[0].text, "0000");
  assert.equal(R("dec", "255", "8")[2].value, "-1");
});

test("تحقق مستقل: الترميز ثم فك الترميز يعيد العدد لكل الأطوال", () => {
  const rand = rng(44);
  for (const N of [4, 8, 16, 32, 64]) for (let t = 0; t < 60; t++) {
    const half = 1n << BigInt(N - 1);
    const v = BigInt(Math.floor((rand() * 2 - 1) * Number(half))) % half;
    const bits = mod.encode(v, N);
    assert.equal(bits.length, N);
    assert.equal(mod.decodeSigned(bits), v);
    if (v !== 0n && v !== -half) assert.equal(mod.decodeSigned(mod.encode(-v, N)), -v);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "dec", x: "300", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "dec", x: "-129", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "dec", x: "1.5", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "bin", x: "102", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "bin", x: "111111111", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "hex", x: "G1", N: "8" }), "x");
  throwsInput(() => mod.solve({ mode: "dec", x: "1", N: "12" }), "N");
});
