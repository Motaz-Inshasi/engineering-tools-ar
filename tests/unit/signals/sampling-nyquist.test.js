import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/signals/sampling-nyquist.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const val = (r, part) => r.results.find((x) => x.label.includes(part)).value;

test("قيم معروفة", () => {
  const r = mod.solve({ fmax: "20k", fs: "44.1k", f0: "" });
  close(val(r, "معدل نايكويست"), 40000);
  close(val(r, "تردد نايكويست"), 22050);
  assert.equal(val(r, "الحكم"), "معدل العينات كافٍ");
  assert.equal(val(mod.solve({ fmax: "5k", fs: "10k" }), "الحكم"), "معدل العينات غير كافٍ (تشويه محتمل)");
  close(mod.aliasOf(1000, 800).fa, 200);
  close(mod.aliasOf(60, 1000).fa, 60);
  close(mod.aliasOf(1000, 1000).fa, 0);
  close(mod.aliasOf(1.5e9, 1e9).fa, 0.5e9);
  close(mod.aliasOf(0, 100).fa, 0);
});

test("تحقق مستقل: عينات النغمة الأصلية = عينات النغمة الظاهرة", () => {
  const rand = rng(8);
  for (let i = 0; i < 200; i++) {
    const fs = 100 + rand() * 1e5, f0 = rand() * 5 * fs;
    const { fa } = mod.aliasOf(f0, fs);
    assert.ok(fa <= fs / 2 + 1e-9);
    for (let n = 0; n < 20; n++) close(Math.cos(2 * Math.PI * f0 * n / fs), Math.cos(2 * Math.PI * fa * n / fs), 1e-6, `${f0} @ ${fs}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ fmax: "4k", fs: "0" }), "fs");
  throwsInput(() => mod.solve({ fmax: "-1", fs: "10" }), "fmax");
  throwsInput(() => mod.solve({ fmax: "1", fs: "10", f0: "-5" }), "f0");
  throwsInput(() => mod.solve({ fmax: "abc", fs: "10" }), "fmax");
});
