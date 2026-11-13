import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/equation-balancer.js";
import { balance, parseFormula } from "../../../lib/chemistry/formula.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const out = (e) => mod.solve({ equation: e }).copy;

test("معادلات معروفة", () => {
  assert.equal(out("H2 + O2 -> H2O"), "2 H2 + O2 → 2 H2O");
  assert.equal(out("Fe + O2 = Fe2O3"), "4 Fe + 3 O2 → 2 Fe2O3");
  assert.equal(out("C3H8 + O2 -> CO2 + H2O"), "C3H8 + 5 O2 → 3 CO2 + 4 H2O");
  assert.equal(out("Cu + HNO3 -> Cu(NO3)2 + NO + H2O"), "3 Cu + 8 HNO3 → 3 Cu(NO3)2 + 2 NO + 4 H2O");
  assert.equal(out("2H2 + O2 → 2H2O"), "2 H2 + O2 → 2 H2O");
  assert.equal(out("Al + H2SO4 -> Al2(SO4)3 + H2"), "2 Al + 3 H2SO4 → Al2(SO4)3 + 3 H2");
});

test("كل الذرات محفوظة في معادلات عشوائية الصعوبة", () => {
  for (const e of ["C8H18 + O2 -> CO2 + H2O", "K4[Fe(CN)6] + KMnO4 + H2SO4 -> KHSO4 + Fe2(SO4)3 + MnSO4 + HNO3 + CO2 + H2O", "Ca3(PO4)2 + SiO2 + C -> CaSiO3 + P4 + CO"]) {
    const b = balance(e);
    const nL = b.reactants.length;
    for (const el of b.elements) {
      const l = b.parsed.slice(0, nL).reduce((a, c, j) => a + (c[el] || 0) * b.coef[j], 0);
      const r = b.parsed.slice(nL).reduce((a, c, k) => a + (c[el] || 0) * b.coef[nL + k], 0);
      assert.equal(l, r, `${e} ${el}`);
    }
    assert.ok(b.coef.every((c) => Number.isInteger(c) && c > 0));
  }
  assert.ok(parseFormula("KHSO4").K === 1);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ equation: "H2 + O2" }), "equation");
  throwsInput(() => mod.solve({ equation: "Na + Cl2 -> KCl" }), "equation");
  throwsInput(() => mod.solve({ equation: "H2 + O2 -> H2O2 + H2O" }), "equation");
  throwsInput(() => mod.solve({ equation: "" }), "equation");
});
