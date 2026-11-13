import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/stoichiometry.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("هابر: الهيدروجين فائض والنيتروجين محدد", () => {
  const r = mod.solve({ equation: "N2 + H2 -> NH3", amounts: "N2 = 28 g\nH2 = 10 g" });
  assert.equal(r.results[1].value, "N2");
  close(parseFloat(r.results[2].value), 2 * (28 / 28.014) * 17.031, 1e-3);
});

test("المادة المحددة تتغير مع الكميات وتقبل المولات", () => {
  const r = mod.solve({ equation: "H2 + O2 -> H2O", amounts: "H2 = 1 mol\nO2 = 1 mol" });
  assert.equal(r.results[1].value, "H2");
  close(parseFloat(r.results[2].value), 18.015, 1e-3);
  const r2 = mod.solve({ equation: "H2 + O2 -> H2O", amounts: "H2 = 4 mol\nO2 = 1 mol" });
  assert.equal(r2.results[1].value, "O2");
});

test("اختيار الناتج ونسبة المردود", () => {
  const r = mod.solve({ equation: "CaCO3 -> CaO + CO2", amounts: "CaCO3 = 100.09 g", product: "CO2", actual: "22" });
  close(parseFloat(r.results[2].value), 44.01, 1e-3);
  close(parseFloat(r.results[3].value), 49.99, 1e-3);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ equation: "H2 + O2 -> H2O", amounts: "Fe = 5 g" }), "amounts");
  throwsInput(() => mod.solve({ equation: "H2 + O2 -> H2O", amounts: "H2 = -5 g" }), "amounts");
  throwsInput(() => mod.solve({ equation: "H2 + O2 -> H2O", amounts: "H2 5" }), "amounts");
  throwsInput(() => mod.solve({ equation: "H2 + O2 -> H2O", amounts: "H2 = 5 g", product: "O2" }), "product");
});
