import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/op-amp.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const O = (o) => mod.solve({ Vsat: "15", ...o }).results;

test("قيم معروفة", () => {
  close(O({ cfg: "noninv", Rf: "9k", Rin: "1k", Vin: "0.2" })[0].value, 10);
  assert.equal(O({ cfg: "noninv", Rf: "9k", Rin: "1k", Vin: "0.2" })[2].value, "2 V");
  assert.equal(O({ cfg: "sum", Rf: "10k", Rs: "10k, 10k", Vs: "1, 2" })[1].value, "-3 V");
  assert.equal(O({ cfg: "diff", Rf: "10k", Rin: "10k", V1d: "1", V2: "3" })[2].value, "2 V");
  close(O({ cfg: "integ", R: "10k", C: "10n", f: String(1 / (2 * Math.PI * 1e-4)), Vin: "1" })[0].value, 1, 1e-9);
  close(O({ cfg: "deriv", R: "1k", C: "1u", f: "1k", Vin: "1" })[0].value, 2 * Math.PI, 1e-9);
  assert.match(O({ cfg: "inv", Rf: "1M", Rin: "1k", Vin: "1" })[3].value, /تشبع/);
});

test("تحقق مستقل: الجامع يساوي مجموع عدة مكبرات عاكسة منفصلة", () => {
  const rs = [1e3, 4.7e3, 22e3], vs = [0.3, -1.2, 2];
  const sum = O({ cfg: "sum", Rf: "10k", Rs: rs.join(","), Vs: vs.join(","), Vsat: "1000" })[1].value;
  let total = 0;
  rs.forEach((r, i) => { total += O({ cfg: "inv", Rf: "10k", Rin: String(r), Vin: String(vs[i]), Vsat: "1000" })[0].value * vs[i]; });
  assert.equal(sum, `${Number(total.toPrecision(4))} V`);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" }), "Rin");
  throwsInput(() => mod.solve({ cfg: "sum", Rf: "10k", Rs: "1k, 2k", Vs: "1", Vsat: "15" }), "Vs");
  throwsInput(() => mod.solve({ cfg: "integ", R: "1k", C: "1u", f: "0", Vin: "1", Vsat: "15" }), "f");
  throwsInput(() => mod.solve({ cfg: "inv", Rf: "1k", Rin: "1k", Vin: "1", Vsat: "0" }), "Vsat");
});
