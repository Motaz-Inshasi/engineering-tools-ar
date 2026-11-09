import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/transformer.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const t = (N1, N2, V1, RL, eff = "") => mod.solve({ N1, N2, V1, RL, eff }).results;

test("قيم معروفة", () => {
  const r = t("1000", "50", "230", "5");
  close(r[0].value, 20);
  assert.equal(r[1].value, "خافض للجهد");
  assert.equal(r[5].value, "2 kΩ");
  assert.equal(t("100", "1000", "12", "1k")[2].text, "V2 = 120 V");
  assert.equal(t("100", "1000", "12", "1k")[1].value, "رافع للجهد");
  assert.equal(t("1", "1", "5", "5")[1].value, "عازل (1:1)");
  const e = t("10", "1", "100", "1", "80");
  assert.equal(e[7].value, "125 W");
  assert.equal(e[8].value, "25 W");
});

test("تحقق مستقل: حفظ القدرة V1 I1 = V2 I2 في المحول المثالي", () => {
  const rand = rng(3);
  for (let k = 0; k < 50; k++) {
    const N1 = 1 + rand() * 5000, N2 = 1 + rand() * 5000, V1 = 1 + rand() * 1e4, RL = 0.1 + rand() * 1e3;
    const r = mod.solve({ N1: String(N1), N2: String(N2), V1: String(V1), RL: String(RL) });
    const a = N1 / N2, V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a;
    close(V1 * I1, V2 * I2, 1e-12);
    close(r.results[0].value, a, 1e-12);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ N1: "1000", N2: "0", V1: "230", RL: "5" }), "N2");
  throwsInput(() => mod.solve({ N1: "1000", N2: "10", V1: "230", RL: "0" }), "RL");
  throwsInput(() => mod.solve({ N1: "1000", N2: "10", V1: "230", RL: "5", eff: "120" }), "eff");
  throwsInput(() => mod.solve({ N1: "", N2: "10", V1: "230", RL: "5" }), "N1");
});
