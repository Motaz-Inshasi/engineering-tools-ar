import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/mosfet.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  assert.deepEqual(mod.drain(0.5, 5, 1, 2e-3), { region: "cutoff", Id: 0 });
  close(mod.drain(3, 5, 1, 2e-3).Id, 4e-3);
  close(mod.drain(3, 1, 1, 2e-3).Id, 2e-3 * (2 * 1 - 0.5));
  close(mod.drain(3, 5, 1, 2e-3, 0.02).Id, 4e-3 * 1.1);
  close(mod.drain(1e3, 1e4, 1, 1e-9).Id, 0.5e-9 * 999 * 999);
  assert.equal(mod.solve({ Vgs: "3", Vds: "0.1", Vth: "1", k: "2m" }).results[0].value, "خطية (Triode)");
});

test("تحقق مستقل: التيار متصل عند حد التشبع VDS = VGS − Vth", () => {
  for (const [Vgs, Vth, k] of [[3, 1, 2e-3], [5, 0.7, 1e-2], [1.2, 0.4, 5e-4]]) {
    const b = Vgs - Vth;
    close(mod.drain(Vgs, b * (1 - 1e-9), Vth, k).Id, mod.drain(Vgs, b, Vth, k).Id, 1e-8);
    const h = 1e-6;
    const slope = (mod.drain(Vgs + h, 10, Vth, k).Id - mod.drain(Vgs - h, 10, Vth, k).Id) / (2 * h);
    close(slope, k * b, 1e-6);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Vgs: "3", Vds: "-5", Vth: "1", k: "2m" }), "Vds");
  throwsInput(() => mod.solve({ Vgs: "3", Vds: "5", Vth: "0", k: "2m" }), "Vth");
  throwsInput(() => mod.solve({ Vgs: "3", Vds: "5", Vth: "1", k: "0" }), "k");
  throwsInput(() => mod.solve({ Vgs: "3", Vds: "5", Vth: "1", k: "1m", lambda: "-1" }), "lambda");
});
