import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/color-converter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const conv = (color) => mod.solve({ color });
const channels = (text) => text.match(/\d+/g).map(Number);

test("#1E90FF ↔ rgb(30,144,255) ↔ hsl(210,100%,56%)", () => {
  const hex = conv("#1E90FF");
  assert.equal(resultValue(hex, "HEX"), "#1E90FF");
  assert.equal(resultValue(hex, "RGB"), "rgb(30, 144, 255)");
  assert.equal(resultValue(hex, "HSL"), "hsl(210, 100%, 56%)");
  assert.equal(resultValue(conv("rgb(30,144,255)"), "HEX"), "#1E90FF");
  assert.equal(resultValue(conv("hsl(210,100%,56%)"), "HSL"), "hsl(210, 100%, 56%)");
  const [r, g, b] = channels(resultValue(conv("hsl(210,100%,56%)"), "RGB"));
  assert.ok(Math.abs(r - 30) <= 2 && Math.abs(g - 144) <= 2 && Math.abs(b - 255) <= 2, `${r},${g},${b}`);
});

test("HSV و CMYK للون الأزرق", () => {
  const res = conv("#1E90FF");
  assert.equal(resultValue(res, "HSV"), "hsv(210, 88%, 100%)");
  assert.equal(resultValue(res, "CMYK"), "cmyk(88%, 44%, 0%, 0%)");
});

test("الأحمر: hsl(0,100%,50%) و cmyk(0%,100%,100%,0%)", () => {
  const res = conv("red");
  assert.equal(resultValue(res, "HSL"), "hsl(0, 100%, 50%)");
  assert.equal(resultValue(res, "CMYK"), "cmyk(0%, 100%, 100%, 0%)");
});

test("نسب التباين: الأبيض مع الأسود 21 والرمادي #808080 مع الأبيض ~3.95", () => {
  const white = conv("#fff");
  assert.equal(resultValue(white, "الأسود"), "21.00 : 1");
  assert.equal(resultValue(white, "الأبيض"), "1.00 : 1");
  const gray = conv("#808080");
  close(parseFloat(resultValue(gray, "مع الأبيض")), 3.95, 0.002, "gray vs white");
  close(parseFloat(resultValue(gray, "مع الأسود")), 5.32, 0.002, "gray vs black");
});

test("hsl(120,100%,25%) يساوي #008000", () => {
  assert.equal(resultValue(conv("hsl(120,100%,25%)"), "HEX"), "#008000");
});

test("الأسماء و HEX المختصر و الشفافية", () => {
  assert.equal(resultValue(conv("  DodgerBlue "), "HEX"), "#1E90FF");
  assert.equal(resultValue(conv("RED"), "HEX"), "#FF0000");
  assert.equal(resultValue(conv("#fff"), "HEX"), "#FFFFFF");
  assert.equal(resultValue(conv("#1E90FF80"), "HEX"), "#1E90FF80");
  assert.equal(resultValue(conv("rgba(0,0,0,0.5)"), "RGB"), "rgba(0, 0, 0, 0.5)");
});

test("التحويل المتبادل بين RGB و HSL يبقى ضمن فرق تقريب صغير", () => {
  for (const hex of ["#123456", "#abcdef", "#ff8800", "#00ff7f", "#777777", "#c0ffee"]) {
    const direct = channels(resultValue(conv(hex), "RGB"));
    const back = channels(resultValue(conv(resultValue(conv(hex), "HSL")), "RGB"));
    back.forEach((v, i) => assert.ok(Math.abs(v - direct[i]) <= 3, `${hex}: ${direct} vs ${back}`));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => conv("#12345"), "color");
  throwsInput(() => conv("rgb(300,0,0)"), "color");
  throwsInput(() => conv("hsl(120,100%,125%)"), "color");
  throwsInput(() => conv("rgb(1,2)"), "color");
  throwsInput(() => conv("bluish"), "color");
  throwsInput(() => conv("   "), "color");
});
