import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/differential-equations/ode-numerical.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const final = (v, m) => Number(mod.solve({ x0: "0", y0: "1", xEnd: "1", exact: "", ...v, method: m }).results[0].value);

test("قيم معروفة لـ y′ = x + y", () => {
  close(final({ f: "x + y", h: "0.1" }, "euler"), 3.187485, 1e-6);
  close(final({ f: "x + y", h: "0.1" }, "rk4"), 2 * Math.E - 2, 2e-6);
  close(final({ f: "y", h: "0.01" }, "rk4"), Math.E, 1e-9);
});

test("رتبة الخطأ: أويلر ~ h، هيون ~ h²، RK4 ~ h⁴", () => {
  const err = (m, h) => Math.abs(final({ f: "y", h: String(h) }, m) - Math.E);
  close(err("euler", 0.01) / err("euler", 0.005), 2, 0.02);
  close(err("heun", 0.01) / err("heun", 0.005), 4, 0.02);
  close(err("rk4", 0.1) / err("rk4", 0.05), 16, 0.05);
});

test("المجال العكسي والمعادلة اللوجستية", () => {
  close(final({ f: "-y", h: "0.01", xEnd: "-1" }, "rk4"), Math.E, 1e-9);
  const r = mod.solve({ f: "y*(1-y)", x0: "0", y0: "0.1", xEnd: "10", h: "0.01", method: "rk4", exact: "1/(1 + 9*exp(-x))" });
  close(Number(r.results[0].value.split(" ")[0]), 1 / (1 + 9 * Math.exp(-10)), 1e-6);
  assert.ok(r.blocks[1].rows.length <= 52);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ f: "x + ", x0: "0", y0: "1", xEnd: "1", h: "0.1" }), "f");
  throwsInput(() => mod.solve({ f: "x + z", x0: "0", y0: "1", xEnd: "1", h: "0.1" }), "f");
  throwsInput(() => mod.solve({ f: "x", x0: "0", y0: "1", xEnd: "0", h: "0.1" }), "xEnd");
  throwsInput(() => mod.solve({ f: "y^2", x0: "0", y0: "1", xEnd: "2", h: "0.01", method: "rk4" }), "h");
  throwsInput(() => mod.solve({ f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0.1", exact: "exp(x) + 1" }), "exact");
});
