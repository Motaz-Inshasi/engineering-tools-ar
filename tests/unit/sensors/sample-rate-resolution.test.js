import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/sample-rate-resolution.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (o) => mod.solve({ N: "12", fs: "1M", osr: "1", ch: "1", ...o }).results;

test("قيم معروفة", () => {
  assert.equal(R({})[0].value, "74 dB");
  assert.equal(R({ osr: "4" })[1].value, "13 بت");
  assert.equal(R({ osr: "256" })[1].value, "16 بت");
  assert.equal(R({ osr: "1", ch: "8" })[3].value, "125 kHz");
  assert.equal(R({ N: "16", fs: "48k" })[4].value, "768 kbit/s (96 kB/s)");
  assert.equal(mod.solve({ N: "12", fs: "1M", osr: "1", ch: "1", snr: "62" }).results[5].value, "10.01 بت");
});

test("تحقق مستقل: ENOB من SNR النظري يعيد عدد البتات", () => {
  for (let N = 1; N <= 32; N++) {
    const snr = 6.02 * N + 1.76;
    const r = mod.solve({ N: String(N), fs: "1", osr: "1", ch: "1", snr: String(snr) }).results;
    assert.equal(r[5].value, `${N} بت`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ N: "12", fs: "1M", osr: "0.5", ch: "4" }), "osr");
  throwsInput(() => mod.solve({ N: "12", fs: "0", osr: "1", ch: "4" }), "fs");
  throwsInput(() => mod.solve({ N: "12", fs: "1", osr: "1", ch: "0" }), "ch");
  throwsInput(() => mod.solve({ N: "40", fs: "1", osr: "1", ch: "1" }), "N");
});
