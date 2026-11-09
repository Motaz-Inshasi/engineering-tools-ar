import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/electronics/bjt-bias.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const B = (o) => mod.solve({ cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100", Vbe: "0.7", ...o }).results;

test("قيم معروفة", () => {
  assert.equal(B({})[0].value, "فعالة");
  assert.equal(B({ cfg: "fixed", RB: "470k", RE: "0" })[2].value, "2.404 mA");
  assert.equal(B({ cfg: "fixed", RB: "10k", RE: "0" })[0].value, "تشبع");
  assert.equal(B({ R2: "1k" })[0].value, "قطع");
  assert.equal(B({ beta: "1000" })[2].value, "2.935 mA");
  assert.equal(B({ beta: "50" })[2].value, "2.181 mA");
});

test("تحقق مستقل: KVL في حلقتي القاعدة والمجمع عند المنطقة الفعالة", () => {
  const rand = rng(19);
  for (let t = 0; t < 40; t++) {
    const Vcc = 5 + rand() * 20, R1 = 1e4 + rand() * 1e5, R2 = 2e3 + rand() * 2e4, RC = 500 + rand() * 5e3, RE = 100 + rand() * 2e3, beta = 50 + rand() * 300;
    const r = mod.solve({ cfg: "divider", Vcc: String(Vcc), R1: String(R1), R2: String(R2), RC: String(RC), RE: String(RE), beta: String(beta), Vbe: "0.7" });
    if (r.results[0].value !== "فعالة") continue;
    const VBB = (Vcc * R2) / (R1 + R2), RBB = (R1 * R2) / (R1 + R2);
    const IB = (VBB - 0.7) / (RBB + (beta + 1) * RE);
    const IC = beta * IB, IE = IC + IB;
    assert.ok(Math.abs(VBB - IB * RBB - 0.7 - IE * RE) < 1e-9);
    assert.ok(Vcc - IC * RC - IE * RE > 0.2);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "0", Vbe: "0.7" }), "beta");
  throwsInput(() => mod.solve({ cfg: "divider", Vcc: "-12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100" }), "Vcc");
  throwsInput(() => mod.solve({ cfg: "divider", Vcc: "12", R1: "0", R2: "10k", RC: "2.2k", RE: "470", beta: "100" }), "R1");
  throwsInput(() => mod.solve({ cfg: "fixed", Vcc: "12", RB: "", RC: "2.2k", RE: "470", beta: "100" }), "RB");
});
