import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/voltage-current-divider.js";
import { parseNetlist, solveMNA } from "../../../lib/core/circuit.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const vout = (Vin, R1, R2, RL = "") => mod.solve({ mode: "voltage", Vin, R1, R2, RL }).results.find((x) => x.label === "نسبة التقسيم").value * parseNumber(Vin);

test("قيم معروفة", () => {
  close(vout("10", "1k", "1k"), 5, 1e-4);
  close(vout("12", "2k", "1k"), 4, 1e-4);
  close(vout("-9", "3", "6"), -6, 1e-4);
  close(vout("5", "1k", "1k", "1k"), 5 / 3, 1e-3);
  close(vout("1e3", "1e9", "1"), 1e-6, 1e-3);
  const c = mod.solve({ mode: "current", IT: "6", list: "1, 2" });
  assert.equal(c.results[0].text, "I1 = 4 A");
  assert.equal(c.results[1].text, "I2 = 2 A");
});

test("تحقق مستقل: مقسم الجهد مع الحمل = حل الدائرة بتحليل العقد", () => {
  const rand = rng(5);
  for (let t = 0; t < 40; t++) {
    const R1 = 10 + rand() * 1e4, R2 = 10 + rand() * 1e4, RL = 10 + rand() * 1e5, V = rand() * 30;
    const r = mod.solve({ mode: "voltage", Vin: String(V), R1: String(R1), R2: String(R2), RL: String(RL) });
    const s = solveMNA(parseNetlist(`V1 1 0 ${V}\nR1 1 2 ${R1}\nR2 2 0 ${R2}\nRL 2 0 ${RL}`));
    const divRatio = r.results.find((x) => x.label === "نسبة التقسيم").value;
    close(divRatio * V, s.V["2"], 1e-10);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" }), "R1");
  throwsInput(() => mod.solve({ mode: "voltage", Vin: "", R1: "1", R2: "1" }), "Vin");
  throwsInput(() => mod.solve({ mode: "voltage", Vin: "1", R1: "1", R2: "1", RL: "-1" }), "RL");
  throwsInput(() => mod.solve({ mode: "current", IT: "1", list: "100" }), "list");
  throwsInput(() => mod.solve({ mode: "current", IT: "x", list: "1, 2" }), "IT");
});
