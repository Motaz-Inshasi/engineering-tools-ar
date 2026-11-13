import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/personal-finance/savings-goal.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" };
const calc = (values) => mod.solve({ ...base, ...values });
const num = (s) => Number(String(s).replace(/,/g, ""));

const simulate = (current, pmt, annualRate, months) => {
  const i = annualRate / 1200;
  let b = current;
  for (let m = 0; m < months; m++) b = b * (1 + i) + pmt;
  return b;
};

test("الإيداع المطلوب يبلغ الهدف عند محاكاة شهرية مستقلة", () => {
  const res = calc({});
  const pmt = num(resultValue(res, "الإيداع الشهري المطلوب"));
  close(pmt, 537.92, 1e-4, "PMT");
  assert.ok(Math.abs(simulate(10000, pmt, 5, 120) - 100000) < 1, "simulated balance");
  assert.equal(calc({}).blocks[0].rows.length, 10);
  assert.equal(calc({}).blocks[0].rows[9][1], "100,000.00");
});

test("بدون عائد: الإيداع هو الفرق مقسوماً على عدد الأشهر", () => {
  const res = calc({ target: "12000", current: "0", rate: "0", time: "1" });
  assert.equal(resultValue(res, "الإيداع الشهري المطلوب"), "1,000.00");
  assert.equal(resultValue(res, "إجمالي الفائدة المتوقعة"), "0.00");
});

test("إذا كانت المدخرات الحالية تكفي للهدف فلا حاجة لإيداع", () => {
  const res = calc({ target: "10000", current: "20000" });
  assert.equal(resultValue(res, "الإيداع الشهري المطلوب"), "لا حاجة لإيداع");
  assert.ok(res.copy.includes("متحقق"), res.copy);
});

test("وضع العكس: 1000 شهرياً بدون عائد تبلغ 12000 في 12 شهراً", () => {
  const res = calc({ mode: "reverse", target: "12000", current: "0", rate: "0", deposit: "1000" });
  assert.ok(resultValue(res, "المدة المطلوبة").startsWith("12 شهر"), resultValue(res, "المدة المطلوبة"));
});

test("وضع العكس: الفرق 9000 بإيداع 500 يحتاج 18 شهراً", () => {
  const res = calc({ mode: "reverse", target: "10000", current: "1000", rate: "0", deposit: "500" });
  assert.ok(resultValue(res, "المدة المطلوبة").startsWith("18 شهر"), resultValue(res, "المدة المطلوبة"));
});

test("اتساق الوضعين: إيداع أعلى قليلاً من المطلوب يختصر المدة، وأقل منه يطيلها", () => {
  const up = parseInt(resultValue(calc({ mode: "reverse", deposit: "537.93" }), "المدة المطلوبة"), 10);
  const down = parseInt(resultValue(calc({ mode: "reverse", deposit: "537.91" }), "المدة المطلوبة"), 10);
  assert.ok(up <= 120, `up ${up}`);
  assert.ok(down >= 121, `down ${down}`);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ time: "1.01", timeUnit: "years" }), "time");
  throwsInput(() => calc({ time: "0" }), "time");
  throwsInput(() => calc({ rate: "150" }), "rate");
  throwsInput(() => calc({ target: "0" }), "target");
  throwsInput(() => calc({ mode: "reverse", rate: "0", deposit: "0" }), "deposit");
  throwsInput(() => calc({ mode: "reverse", current: "0", rate: "5", deposit: "0" }), "deposit");
});
