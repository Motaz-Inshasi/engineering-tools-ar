import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/mesh-analysis.js";
import { parseNetlist, solveMNA } from "../../../lib/core/circuit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const I = (br) => mod.meshSolve(mod.parseBranches(br)).I;

test("دوائر كتابية", () => {
  const a = I("1 0 10 20\n1 2 10 0\n2 0 10 0");
  close(a[0], 4 / 3); close(a[1], 2 / 3);
  const b = I("1 0 5 10");
  close(b[0], 2);
  const c = I("1 0 1e6 1\n");
  close(c[0], 1e-6);
  const d = I("1 0 2 0\n1 2 3 0\n2 0 4 -7");
  close(d[0], -21 / 26); close(d[1], -35 / 26);
});

test("تحقق مستقل: نتائج الحلقات = نتائج تحليل العقد للدائرة نفسها", () => {
  const rand = rng(14);
  for (let t = 0; t < 40; t++) {
    const [Ra, Rb, Rc, Rd, Re] = Array.from({ length: 5 }, () => 1 + rand() * 100);
    const [V1, V2] = [rand() * 20 - 10, rand() * 20 - 10];
    const m = I(`1 0 ${Ra} ${V1}\n1 2 ${Rb} 0\n2 0 ${Rc} 0\n2 3 ${Rd} 0\n3 0 ${Re} ${V2}`);
    const s = solveMNA(parseNetlist(`V1 n1 0 ${V1}\nRA n1 a ${Ra}\nRB a 0 ${Rb}\nRC a b ${Rc}\nRD b 0 ${Rd}\nRE b n3 ${Re}\nV2 0 n3 ${V2}`));
    close(m[0], s.branches.find((x) => x.name === "RA").i, 1e-9);
    close(m[0] - m[1], s.branches.find((x) => x.name === "RB").i, 1e-9);
    close(m[1], s.branches.find((x) => x.name === "RC").i, 1e-9);
    close(m[1] - m[2], s.branches.find((x) => x.name === "RD").i, 1e-9);
    close(m[2], s.branches.find((x) => x.name === "RE").i, 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ br: "1 0 0 5" }), "br");
  throwsInput(() => mod.solve({ br: "1 1 5 5" }), "br");
  throwsInput(() => mod.solve({ br: "1 0 -5 5" }), "br");
  throwsInput(() => mod.solve({ br: "1 0 5 5\n3 0 5 0" }), "br");
  throwsInput(() => mod.solve({ br: "" }), "br");
  throwsInput(() => mod.solve({ br: "0 1 5" }), "br");
});
