import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/solutions.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "molarity", mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const run = (o) => mod.solve({ ...base, ...o });
const num = (s) => Number(String(s).split(" ")[0]);

test("التركيز المولي: قيم معروفة", () => {
  close(num(run({ mass: "5.844", molarMass: "58.44", volume: "0.5" }).results[1].value), 0.2, 1e-9, "NaCl 5.844 g");
  close(num(run({ mass: "10", molarMass: "40", volume: "2" }).results[1].value), 0.125, 1e-9, "10 g of 40 g/mol in 2 L");
  close(num(run({ mass: "10", molarMass: "40", volume: "2" }).results[0].value), 0.25, 1e-9, "moles");
});

test("التخفيف: إيجاد كل مجهول من ثلاث قيم", () => {
  close(num(run({ mode: "dilution", C1: "1", V1: "0.1", V2: "0.5" }).results[0].value), 0.2, 1e-9, "C2");
  close(num(run({ mode: "dilution", C1: "0.5", V1: "0.2", C2: "0.1" }).results[0].value), 1, 1e-9, "V2");
  close(num(run({ mode: "dilution", C1: "2", C2: "0.1", V2: "0.5" }).results[0].value), 0.025, 1e-9, "V1");
  close(num(run({ mode: "dilution", V1: "0.5", C2: "0.2", V2: "0.25" }).results[0].value), 0.1, 1e-9, "C1");
  const r = run({ mode: "dilution", C1: "3", V1: "0.4", V2: "1.2" });
  close(num(r.results[0].value) * 1.2, 3 * 0.4, 1e-4, "C1V1 = C2V2");
});

test("النسبة المئوية والمولالية وppm", () => {
  close(num(run({ mode: "percent", mass: "12", solutionMass: "150" }).results[0].value), 8, 1e-9, "12 of 150 g");
  close(num(run({ mode: "molality", mass: "58.44", molarMass: "58.44", solventKg: "0.5" }).results[1].value), 2, 1e-9, "1 mol in 0.5 kg");
  close(num(run({ mode: "ppm", massMg: "5", volume: "0.5" }).results[0].value), 10, 1e-9, "5 mg in 0.5 L");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ mode: "dilution", C1: "1", V1: "0.1" }), "C2");
  throwsInput(() => run({ mode: "dilution", C1: "1", V1: "1", C2: "1", V2: "1" }), "C1");
  throwsInput(() => run({ mass: "1", molarMass: "58.44", volume: "0" }), "volume");
  throwsInput(() => run({ mode: "percent", mass: "200", solutionMass: "100" }), "mass");
  throwsInput(() => run({ mode: "molality", mass: "1", molarMass: "58.44", solventKg: "" }), "solventKg");
  throwsInput(() => run({ mode: "ppm", massMg: "-1", volume: "1" }), "massMg");
  throwsInput(() => run({ mass: "abc", molarMass: "58.44", volume: "1" }), "mass");
  throwsInput(() => run({ mode: "unknown" }), "mode");
});
