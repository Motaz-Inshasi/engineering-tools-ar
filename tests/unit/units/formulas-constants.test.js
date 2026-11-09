import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/units/formulas-constants.js";
import katex from "../../../vendor/katex/katex.min.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const F = (cat, find = "") => mod.solve({ cat, find }).results;

test("البحث والتصنيف", () => {
  assert.equal(F("constants")[0].value, mod.CONSTANTS.length);
  assert.equal(F("constants")[1].value, 0);
  assert.equal(F("all")[1].value, mod.FORMULAS.length);
  assert.equal(F("all", "رنين")[1].value, 1);
  assert.equal(F("ac")[0].value, 0);
  assert.ok(F("all", "الضوء")[0].value >= 1);
  throwsInput(() => mod.solve({ cat: "all", find: "zzzzqqq" }), "find");
  throwsInput(() => mod.solve({ cat: "nope" }), "cat");
});

test("تحقق مستقل: علاقات بين الثوابت (c² = 1/(μ0 ε0)، k·NA = R، Z0 = μ0·c)", () => {
  const v = (sym) => Number(mod.CONSTANTS.find((c) => c.sym === sym).value);
  close(v("c") ** 2 * v("\\mu_0") * v("\\varepsilon_0"), 1, 1e-9);
  close(v("k_B") * v("N_A"), v("R"), 1e-9);
  close(v("\\mu_0") * v("c"), v("Z_0"), 1e-9);
  close((v("k_B") * 298.15) / v("e"), v("V_T = kT/q"), 1e-4);
});

test("كل الصيغ صالحة للعرض بـ KaTeX", () => {
  for (const f of mod.FORMULAS) assert.doesNotThrow(() => katex.renderToString(f.tex, { throwOnError: true }), f.name);
  for (const c of mod.CONSTANTS) assert.doesNotThrow(() => katex.renderToString(c.sym, { throwOnError: true }), c.name);
});
