import { test } from "node:test";
import { assert, close, throwsInput, rng } from "../helpers.js";
import { parseNetlist, solveMNA, kclResiduals } from "../../../lib/core/circuit.js";

const solve = (t) => solveMNA(parseNetlist(t));

test("دوائر معروفة", () => {
  const d = solve("V1 1 0 10\nR1 1 2 1k\nR2 2 0 1k");
  close(d.V["2"], 5);
  close(d.branches[0].i, -0.005);
  const i = solve("I1 0 1 2m\nR1 1 0 5k");
  close(i.V["1"], 10);
  const b = solve("V1 1 0 12\nR1 1 2 4\nR2 2 0 6\nR3 2 3 3\nV2 3 0 6");
  close(b.V["2"], (12 / 4 + 6 / 3) / (1 / 4 + 1 / 6 + 1 / 3));
  const g = solve("V1 a gnd 1e-6\nR1 a gnd 1e9");
  close(g.branches[1].i, 1e-15);
});

test("تحقق مستقل: KCL عند كل عقدة ومجموع القدرات = صفر (تيليجن)", () => {
  const rand = rng(31);
  for (let t = 0; t < 80; t++) {
    const N = 2 + Math.floor(rand() * 6);
    const lines = [`V1 1 0 ${(rand() * 20 - 10).toFixed(3)}`];
    for (let k = 1; k <= N; k++) lines.push(`RG${k} ${k} 0 ${(10 + rand() * 1000).toFixed(2)}`);
    for (let k = 0; k < N * 2; k++) {
      const a = 1 + Math.floor(rand() * N), b = 1 + Math.floor(rand() * N);
      if (a !== b) lines.push(`RX${k} ${a} ${b} ${(1 + rand() * 500).toFixed(2)}`);
    }
    if (N > 2) lines.push(`I1 ${N} ${N - 1} ${(rand() * 0.1).toFixed(4)}`);
    const s = solve(lines.join("\n"));
    for (const r of Object.values(kclResiduals(s))) assert.ok(Math.abs(r) < 1e-9, `KCL ${r}`);
    const p = s.branches.reduce((a, b) => a + b.p, 0);
    const scale = s.branches.reduce((a, b) => a + Math.abs(b.p), 0);
    assert.ok(Math.abs(p) <= 1e-9 * Math.max(1, scale), `power balance ${p}`);
    for (const b of s.branches) close(s.V[b.a] - s.V[b.b], b.v, 1e-12);
  }
});

test("دوائر غير قابلة للحل برسائل واضحة", () => {
  throwsInput(() => solve("V1 1 0 5\nV2 1 0 6"), "net");
  throwsInput(() => solve("V1 1 0 5\nR1 2 3 10"), "net");
  throwsInput(() => solve("R1 1 2 10"), "net");
  throwsInput(() => solve("I1 0 1 1\nI2 1 0 1"), "net");
  throwsInput(() => parseNetlist("R1 1 0 0"), "net");
  throwsInput(() => parseNetlist("X1 1 0 5"), "net");
  throwsInput(() => parseNetlist("R1 1 0"), "net");
  throwsInput(() => parseNetlist("R1 1 1 5"), "net");
  throwsInput(() => parseNetlist("R1 1 0 5\nR1 2 0 5"), "net");
  throwsInput(() => parseNetlist(""), "net");
});
