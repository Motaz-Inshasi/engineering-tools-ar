import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/architecture/stair-design.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const st = (H, riser = "17", blondel = "63", avail = "") => mod.solve({ H, riser, blondel, avail });

test("ارتفاع 300 سم: 18 درجة وR = 50/3 وG = 89/3 والامتداد 1513/3", () => {
  const v = st("300").values;
  assert.equal(v.n, 18);
  assert.equal(v.treads, 17);
  close(v.R, 50 / 3, 1e-9);
  close(v.G, 89 / 3, 1e-9);
  close(v.run, 1513 / 3, 1e-9);
  assert.equal(st("300").results[0].value, "18");
});

test("ارتفاع 270 سم بدرجة مفضلة 18 سم: قيم مطابقة تماماً للحدود", () => {
  const v = st("270", "18").values;
  assert.equal(v.n, 15);
  close(v.R, 18, 1e-9);
  close(v.G, 27, 1e-9);
  close(v.run, 378, 1e-9);
  assert.equal(v.allOk, true);
});

test("ارتفاع 320 سم بدرجة 16 سم: طول الحاجز المائل", () => {
  const v = st("320", "16").values;
  assert.equal(v.n, 20);
  close(v.G, 31, 1e-9);
  close(v.run, 589, 1e-9);
  close(v.stringer, Math.sqrt(320 * 320 + 589 * 589), 1e-9);
  close(v.stringer, 670.314, 1e-5);
});

test("تحقق عكسي: عدد الدرجات في الارتفاع الكلي وقاعدة بلوندل محققة", () => {
  for (const H of ["250", "300", "345"]) {
    const v = st(H).values;
    close(v.n * v.R, Number(H), 1e-9);
    close(v.twoRG, 63, 1e-9);
  }
});

test("الطول المتاح الأصغر من الامتداد يعطي حكماً بالتعديل", () => {
  const r = st("300", "17", "63", "400");
  assert.equal(r.values.allOk, false);
  assert.equal(r.results.find((x) => x.label === "الحكم").value, "يحتاج إلى تعديل");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => st("20"), "H");
  throwsInput(() => st("0"), "H");
  throwsInput(() => st("300", "0"), "riser");
  throwsInput(() => st("300", "17", "20"), "blondel");
  throwsInput(() => st("300", "17", "63", "-5"), "avail");
});
