import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/molar-mass.js";
import { parseFormula, molarMass } from "../../../lib/chemistry/formula.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("كتل مولية معروفة", () => {
  const M = (f) => molarMass(parseFormula(f));
  close(M("H2O"), 18.015, 1e-4);
  close(M("NaCl"), 58.44, 1e-4);
  close(M("CO2"), 44.009, 1e-4);
  close(M("CaCO3"), 100.086, 1e-4);
  close(M("CuSO4·5H2O"), 249.68, 1e-4);
  close(M("Ca(OH)2"), 74.092, 1e-4);
  close(M("K4[Fe(CN)6]"), 368.35, 1e-4);
  close(M("Al2(SO4)3"), 342.15, 1e-4);
});

test("تحليل الصيغ: الأقواس والماء المتبلور والأرقام السفلية", () => {
  assert.deepEqual(parseFormula("Mg3(PO4)2"), { Mg: 3, P: 2, O: 8 });
  assert.deepEqual(parseFormula("C₆H₁₂O₆"), { C: 6, H: 12, O: 6 });
  assert.deepEqual(parseFormula("Co"), { Co: 1 });
  assert.deepEqual(parseFormula("CO"), { C: 1, O: 1 });
  assert.deepEqual(parseFormula("Na2CO3.10H2O"), { Na: 2, C: 1, O: 13, H: 20 });
});

test("النسب الكتلية مجموعها 100 وتحويل المولات عكسي", () => {
  const r = mod.solve({ formula: "C6H12O6", mode: "mol", moles: "2" });
  assert.equal(r.results[2].value, "360.3 g");
  const pct = r.blocks[0].rows.reduce((a, row) => a + parseFloat(row[4]), 0);
  close(pct, 100, 1e-3);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ formula: "", mode: "none" }), "formula");
  throwsInput(() => mod.solve({ formula: "h2o", mode: "none" }), "formula");
  throwsInput(() => mod.solve({ formula: "Ca(OH2", mode: "none" }), "formula");
  throwsInput(() => mod.solve({ formula: "H2O", mode: "mass", mass: "-1" }), "mass");
});
