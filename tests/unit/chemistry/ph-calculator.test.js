import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/ph-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { type: "strong-acid", C: "", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" };
const run = (o) => mod.solve({ ...base, ...o });
const pH = (o) => Number(run(o).results[0].value);
const pOH = (o) => Number(run(o).results[1].value);

function bisectAcidH(C, Ka) {
  let lo = 0, hi = C;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (mid * (mid + Ka) - Ka * C > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

test("حمض قوي وقاعدة قوية: قيم معروفة", () => {
  close(pH({ type: "strong-acid", C: "0.01" }), 2, 1e-9, "HCl 0.01 M");
  close(pOH({ type: "strong-acid", C: "0.01" }), 12, 1e-9, "pOH of HCl 0.01 M");
  close(pH({ type: "strong-base", C: "0.001" }), 11, 1e-9, "NaOH 0.001 M");
  close(pH({ type: "strong-base", C: "0.01", hydroxides: "2" }), 12.30103, 1e-4, "Ca(OH)2 0.01 M");
  close(pH({ type: "strong-acid", C: "1e-8" }), -Math.log10((1e-8 + Math.sqrt(1e-16 + 4e-14)) / 2), 1e-4, "very dilute acid");
});

test("حمض ضعيف: حل x² + Ka x − Ka C = 0 مستقل بالتنصيف", () => {
  const H = bisectAcidH(0.1, 1.8e-5);
  close(pH({ type: "weak-acid", C: "0.1", constVal: "1.8e-5" }), -Math.log10(H), 1e-4, "acetic acid 0.1 M, Ka 1.8e-5");
  const pKaForm = pH({ type: "weak-acid", C: "0.1", constKind: "pK", constVal: "4.74" });
  close(pKaForm, -Math.log10(bisectAcidH(0.1, Math.pow(10, -4.74))), 1e-4, "pKa form");
  const alpha = run({ type: "weak-acid", C: "0.1", constVal: "1.8e-5" }).results[5].value;
  close(Number(alpha.split(" ")[0]), (100 * H) / 0.1, 1e-3, "percent ionization");
});

test("قاعدة ضعيفة ومحلول منظم", () => {
  close(pOH({ type: "weak-base", C: "0.1", constVal: "1.8e-5" }), -Math.log10(bisectAcidH(0.1, 1.8e-5)), 1e-4, "NH3-like pOH");
  close(pH({ type: "weak-base", C: "0.1", constVal: "1.8e-5" }), 14 + Math.log10(bisectAcidH(0.1, 1.8e-5)), 1e-4, "NH3-like pH");
  close(pH({ type: "buffer", pKa: "4.76", A: "0.1", HA: "0.1" }), 4.76, 1e-9, "equal concentrations");
  close(pH({ type: "buffer", pKa: "4.76", A: "0.1", HA: "0.2" }), 4.76 + Math.log10(0.5), 1e-4, "ratio 1:2");
  close(pH({ type: "buffer", pKa: "4.76", A: "1", HA: "0.1" }), 5.76, 1e-4, "ratio 10:1");
});

test("من pH وتصنيف المحلول والتحقق pH + pOH = 14", () => {
  close(pH({ type: "from-ph", pH: "3" }), 3, 1e-9, "pH 3");
  close(pOH({ type: "from-ph", pH: "3" }), 11, 1e-9, "pOH of pH 3");
  assert.equal(run({ type: "from-ph", pH: "7" }).results[4].value, "متعادل");
  assert.equal(run({ type: "from-ph", pH: "3" }).results[4].value, "حمضي");
  assert.equal(run({ type: "strong-base", C: "0.01" }).results[4].value, "قاعدي");
  for (const o of [{ type: "strong-acid", C: "0.3" }, { type: "weak-acid", C: "0.05", constVal: "6.3e-5" }, { type: "buffer", pKa: "9.25", A: "0.2", HA: "0.5" }]) {
    close(pH(o) + pOH(o), 14, 1e-4, JSON.stringify(o));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ type: "strong-acid", C: "0" }), "C");
  throwsInput(() => run({ type: "weak-acid", C: "0.1", constVal: "0" }), "constVal");
  throwsInput(() => run({ type: "weak-acid", C: "", constVal: "1.8e-5" }), "C");
  throwsInput(() => run({ type: "buffer", pKa: "4.76", A: "0.1", HA: "0" }), "HA");
  throwsInput(() => run({ type: "from-ph", pH: "15" }), "pH");
  throwsInput(() => run({ type: "unknown" }), "type");
});
