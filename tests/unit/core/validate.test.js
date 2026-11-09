import { test } from "node:test";
import { assert, throwsInput } from "../helpers.js";
import { num, str, choice, numList, matrixInput } from "../../../lib/core/validate.js";

test("num يتحقق من القيم ويعطي رسائل عربية", () => {
  assert.equal(num({ R: "4.7k" }, "R", "المقاومة"), 4700);
  throwsInput(() => num({}, "R", "المقاومة"), "R");
  throwsInput(() => num({ R: "abc" }, "R", "المقاومة"), "R");
  throwsInput(() => num({ R: "0" }, "R", "المقاومة", { positive: true }), "R");
  throwsInput(() => num({ R: "-1" }, "R", "المقاومة", { nonNegative: true }), "R");
  throwsInput(() => num({ n: "2.5" }, "n", "العدد", { integer: true }), "n");
  throwsInput(() => num({ n: "20" }, "n", "العدد", { max: 10 }), "n");
  throwsInput(() => num({ n: "inf" }, "n", "العدد"), "n");
  assert.equal(num({ n: "inf" }, "n", "العدد", { allowInfinity: true }), Infinity);
  assert.equal(num({ n: "" }, "n", "العدد", { optional: true }), null);
  assert.equal(num({ n: "" }, "n", "العدد", { default: 3 }), 3);
});

test("str و choice", () => {
  assert.equal(str({ a: " x " }, "a", "النص"), "x");
  throwsInput(() => str({ a: "" }, "a", "النص"), "a");
  assert.equal(choice({ m: "b" }, "m", "النمط", ["a", "b"]), "b");
  assert.equal(choice({}, "m", "النمط", ["a", "b"], "a"), "a");
  throwsInput(() => choice({ m: "z" }, "m", "النمط", ["a", "b"]), "m");
});

test("numList و matrixInput", () => {
  assert.deepEqual(numList({ l: "1, 2k ؛ 3" }, "l", "القائمة"), [1, 2000, 3]);
  throwsInput(() => numList({ l: "1, x" }, "l", "القائمة"), "l");
  throwsInput(() => numList({ l: "1, -2" }, "l", "القائمة", { positive: true }), "l");
  assert.deepEqual(matrixInput({ m: "1 2\n3 4" }, "m", "المصفوفة"), [[1, 2], [3, 4]]);
  assert.deepEqual(matrixInput({ m: "1,2;3,4" }, "m", "المصفوفة"), [[1, 2], [3, 4]]);
  throwsInput(() => matrixInput({ m: "1 2\n3" }, "m", "المصفوفة"), "m");
  throwsInput(() => matrixInput({ m: "1 2 3\n4 5 6" }, "m", "المصفوفة", { square: true }), "m");
});
