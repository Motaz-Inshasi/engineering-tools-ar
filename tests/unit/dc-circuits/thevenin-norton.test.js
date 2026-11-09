import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/thevenin-norton.js";
import { parseNetlist, solveMNA } from "../../../lib/core/circuit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const th = (net, a, b) => mod.thevenin(parseNetlist(net), a, b);

test("مكافئات كتابية", () => {
  const r = th("V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", "3", "0");
  close(r.Voc, 8); close(r.Rth, 4);
  const n = th("I1 0 1 2\nR1 1 0 10", "1", "0");
  close(n.Voc, 20); close(n.Rth, 10);
  const m = th("V1 1 0 10\nI1 0 2 1\nR1 1 2 5\nR2 2 0 5", "2", "0");
  close(m.Voc, 7.5); close(m.Rth, 2.5);
  const z = th("V1 1 0 5\nR1 1 0 100", "1", "0");
  close(z.Voc, 5); close(z.Rth, 0, 1e-9);
  const big = th("V1 1 0 1\nR1 1 2 1e9\nR2 2 0 1e9", "2", "0");
  close(big.Voc, 0.5); close(big.Rth, 5e8);
});

test("تحقق مستقل: تيار الحمل من المكافئ = تيار الحمل في الدائرة الكاملة", () => {
  const rand = rng(23);
  for (let t = 0; t < 40; t++) {
    const R = Array.from({ length: 5 }, () => 1 + rand() * 1000);
    const net = `V1 1 0 ${rand() * 20}\nR1 1 2 ${R[0]}\nR2 2 0 ${R[1]}\nR3 2 3 ${R[2]}\nR4 3 0 ${R[3]}\nI1 0 3 ${rand() * 0.05}`;
    const r = th(net, "3", "2");
    const RL = 1 + rand() * 500;
    const full = solveMNA(parseNetlist(`${net}\nRL 3 2 ${RL}`));
    close(r.Voc / (r.Rth + RL), full.branches.find((b) => b.name === "RL").i, 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ net: "V1 1 0 24\nR1 1 2 6", a: "5", b: "0" }), "a");
  throwsInput(() => mod.solve({ net: "V1 1 0 24\nR1 1 0 6", a: "1", b: "1" }), "b");
  throwsInput(() => mod.solve({ net: "V1 1 0 24\nR1 1 0 6", a: "1", b: "x" }), "b");
  throwsInput(() => mod.solve({ net: "V1 1 0 24\nR1 1 0 6", a: "1", b: "0", RL: "-3" }), "RL");
  throwsInput(() => mod.solve({ net: "", a: "1", b: "0" }), "net");
});
