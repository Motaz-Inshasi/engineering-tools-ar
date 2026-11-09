import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/units/unit-converter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.convert("length", 1, "in", "mm"), 25.4);
  close(mod.convert("length", 1, "mi", "km"), 1.609344);
  close(mod.convert("temperature", -40, "C", "F"), -40);
  close(mod.convert("temperature", 0, "K", "C"), -273.15);
  close(mod.convert("energy", 1, "kWh", "MJ"), 3.6);
  close(mod.convert("power", 0, "dBm", "mW"), 1);
  close(mod.convert("power", 30, "dBm", "W"), 1);
  close(mod.convert("power", 1, "hp", "W"), 745.6998715822702);
  close(mod.convert("frequency", 3000, "rpm", "Hz"), 50);
  close(mod.convert("frequency", 50, "Hz", "period"), 0.02);
  close(mod.convert("charge", 2000, "mAh", "C"), 7200);
  close(mod.convert("energy", 1, "eV", "J"), 1.602176634e-19);
});

test("تحقق مستقل: التحويل ذهاباً وإياباً يعيد القيمة لكل أزواج الوحدات", () => {
  const rand = rng(61);
  for (const [cat, def] of Object.entries(mod.UNITS)) {
    const keys = Object.keys(def.units);
    for (const a of keys) for (const b of keys) {
      const x = cat === "temperature" ? rand() * 500 : 0.001 + rand() * 1000;
      close(mod.convert(cat, mod.convert(cat, x, a, b), b, a), x, 1e-9, `${cat} ${a}→${b}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ cat: "temperature", x: "-300", from_temperature: "C", to_temperature: "K" }), "x");
  throwsInput(() => mod.solve({ cat: "power", x: "-1", from_power: "W", to_power: "dBm" }), "x");
  throwsInput(() => mod.solve({ cat: "length", x: "abc", from_length: "m", to_length: "ft" }), "x");
  throwsInput(() => mod.solve({ cat: "length", x: "1", from_length: "parsec", to_length: "ft" }), "from_length");
  throwsInput(() => mod.solve({ cat: "volume", x: "1" }), "cat");
});
