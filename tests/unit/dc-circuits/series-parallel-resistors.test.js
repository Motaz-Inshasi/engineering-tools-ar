import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/series-parallel-resistors.js";
import { parseNetlist, solveMNA } from "../../../lib/core/circuit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.equivalent([100, 200, 300], "series"), 600);
  close(mod.equivalent([100, 100], "parallel"), 50);
  close(mod.equivalent([6, 3], "parallel"), 2);
  close(mod.equivalent([1e6, 1e-3], "parallel"), 1e-3 * 1e6 / (1e6 + 1e-3));
  close(mod.equivalent([47], "parallel"), 47);
  close(mod.equivalent([1e9, 1e9, 1e9], "series"), 3e9);
  assert.equal(mod.solve({ list: "1k 1k", mode: "parallel" }).results[0].text, "Req = 500 Ω");
});

test("تحقق مستقل: المكافئة = حل الدائرة الكاملة بتحليل العقد", () => {
  const rand = rng(12);
  for (let t = 0; t < 40; t++) {
    const n = 2 + Math.floor(rand() * 6);
    const rs = Array.from({ length: n }, () => 1 + rand() * 1e4);
    const par = rs.map((r, k) => `R${k} 1 0 ${r}`).join("\n");
    const sp = solveMNA(parseNetlist(`V1 1 0 1\n${par}`));
    close(1 / -sp.branches[0].i, mod.equivalent(rs, "parallel"), 1e-10);
    const ser = rs.map((r, k) => `R${k} ${k + 1} ${k + 2 > n ? 0 : k + 2} ${r}`).join("\n");
    const ss = solveMNA(parseNetlist(`V1 1 0 1\n${ser}`));
    close(1 / -ss.branches[0].i, mod.equivalent(rs, "series"), 1e-10);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ list: "100, -5", mode: "series" }), "list");
  throwsInput(() => mod.solve({ list: "100, 0", mode: "parallel" }), "list");
  throwsInput(() => mod.solve({ list: "", mode: "series" }), "list");
  throwsInput(() => mod.solve({ list: "100", mode: "both" }), "mode");
  throwsInput(() => mod.solve({ list: "100", mode: "series", V: "0" }), "V");
});
