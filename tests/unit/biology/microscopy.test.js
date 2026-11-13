import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/biology/microscopy.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const mag = (obj, ocular, fn) => mod.solve({ mode: "magnification", obj, ocular, fn });

test("40× و10× مع FN = 20 mm: التكبير 400× ومجال الرؤية 0.5 mm", () => {
  const res = mag("40", "10", "20");
  assert.equal(resultValue(res, "التكبير الكلي"), "400×");
  assert.equal(resultValue(res, "قطر مجال الرؤية"), "0.5 mm (500 µm)");
});

test("قدرة التفريق: λ = 550 nm و NA = 1.25 تعطي Rayleigh = 268.4 nm و Abbe = 220 nm", () => {
  const res = mod.solve({ mode: "resolution", lambda: "550", NA: "1.25" });
  assert.equal(resultValue(res, "Rayleigh"), "268.4 nm");
  assert.equal(resultValue(res, "Abbe"), "220 nm");
  close(0.61 * 550 / 1.25, 268.36, 1e-3);
});

test("حجم الجسم من الصورة: 5 mm عند 400× = 12.5 µm", () => {
  const res = mod.solve({ mode: "size", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5" });
  assert.equal(resultValue(res, "الحجم الفعلي"), "12.5 µm");
});

test("حجم الخلية من عدد الخلايا عبر المجال: 500 µm على 5 خلايا = 100 µm", () => {
  const res = mod.solve({ mode: "size", obj: "40", ocular: "10", fn: "20", sizeBy: "fov", across: "5" });
  assert.equal(resultValue(res, "حجم الخلية"), "100 µm");
  assert.equal(resultValue(res, "قطر مجال الرؤية"), "500 µm");
});

test("التكبير بالكسر العشري: 100× مع 10× و FN = 22 mm يعطي مجالاً 0.22 mm", () => {
  const res = mag("100", "10", "22");
  assert.equal(resultValue(res, "التكبير الكلي"), "1000×");
  assert.equal(resultValue(res, "قطر مجال الرؤية"), "0.22 mm (220 µm)");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mag("0", "10", "20"), "obj");
  throwsInput(() => mag("40", "10", "-1"), "fn");
  throwsInput(() => mod.solve({ mode: "resolution", lambda: "550", NA: "0" }), "NA");
  throwsInput(() => mod.solve({ mode: "resolution", lambda: "abc", NA: "1.25" }), "lambda");
  throwsInput(() => mod.solve({ mode: "size", obj: "40", ocular: "10", fn: "20", sizeBy: "fov", across: "2.5" }), "across");
  throwsInput(() => mod.solve({ mode: "size", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "0" }), "measured");
});
