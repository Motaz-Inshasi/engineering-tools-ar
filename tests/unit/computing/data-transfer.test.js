import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/computing/data-transfer.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (size, sizeUnit, speed, speedUnit, overhead = "0") => mod.solve({ size, sizeUnit, speed, speedUnit, overhead });

test("1 GB عبر 100 Mbit/s = 80 s", () => {
  const res = run("1", "GB", "100", "Mbit/s");
  assert.equal(resultValue(res, "بالثواني"), "80 s");
  assert.equal(resultValue(res, "h:mm:ss"), "0:01:20");
});

test("1 GiB عبر 100 Mbit/s ≈ 85.9 s (8 × 2^30 / 10^8)", () => {
  close(Number(resultValue(run("1", "GiB", "100", "Mbit/s"), "بالثواني").split(" ")[0]), 85.89934592, 1e-3);
});

test("10 MB عبر 1 MB/s = 10 s (الثماني بت لكل بايت)", () => {
  assert.equal(resultValue(run("10", "MB", "1", "MB/s"), "بالثواني"), "10 s");
});

test("الفاقد يرفع الزمن: 20% على 1 GB/100 Mbit/s = 100 s", () => {
  assert.equal(resultValue(run("1", "GB", "100", "Mbit/s", "20"), "h:mm:ss"), "0:01:40");
});

test("تنسيق h:mm:ss", () => {
  assert.equal(mod.hms(3725), "1:02:05");
  assert.equal(mod.hms(0), "0:00:00");
});

test("جدول تحويل الحجم: 1 TB = 1000 GB و 931.3226 GiB", () => {
  const table = run("1", "TB", "1", "Mbit/s").blocks[0];
  assert.equal(table.rows.length, 10);
  assert.equal(table.rows.find((r) => r[0] === "GB")[1], "1000");
  close(Number(table.rows.find((r) => r[0] === "GiB")[1]), 931.3225746, 1e-5);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run("0", "GB", "100", "Mbit/s"), "size");
  throwsInput(() => run("1", "GB", "-1", "Mbit/s"), "speed");
  throwsInput(() => run("1", "GB", "100", "Mbit/s", "100"), "overhead");
  throwsInput(() => run("1", "PB", "100", "Mbit/s"), "sizeUnit");
  throwsInput(() => run("1", "GB", "100", "GB/s"), "speedUnit");
});
