import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/computing/subnet-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (r, l) => r.results.find((x) => x.label.startsWith(l)).value;

test("قيم معروفة", () => {
  const r = mod.solve({ ip: "10.0.5.9", mask: "255.255.240.0" });
  assert.equal(v(r, "عنوان الشبكة"), "10.0.0.0/20");
  assert.equal(v(r, "عنوان البث"), "10.0.15.255");
  assert.equal(v(r, "عدد المضيفين"), "4,094 مضيفاً");
  assert.equal(v(r, "القناع العكسي"), "0.0.15.255");
  assert.equal(v(r, "الفئة"), "A / خاص (RFC 1918)");
  assert.equal(v(mod.solve({ ip: "8.8.8.8/32" }), "عدد المضيفين"), "مضيف واحد");
  assert.equal(v(mod.solve({ ip: "192.168.1.1/31" }), "أول مضيف"), "192.168.1.0 – 192.168.1.1");
  assert.equal(v(mod.solve({ ip: "200.1.2.3/24" }), "الفئة"), "C / عام");
});

test("التقسيم إلى شبكات فرعية", () => {
  const r = mod.solve({ ip: "172.16.0.0/24", subnets: "3" });
  assert.equal(r.blocks[1].rows.length, 4);
  assert.deepEqual(r.blocks[1].rows[1], ["2", "172.16.0.64/26", "172.16.0.65 – 172.16.0.126", "172.16.0.127"]);
  assert.ok(v(r, "البادئة الجديدة").startsWith("/26"));
});

test("الشبكة تحتوي العنوان دائماً", () => {
  for (let p = 0; p <= 32; p++) {
    const r = mod.solve({ ip: `203.0.113.77/${p}` });
    const [net] = v(r, "عنوان الشبكة").split("/");
    const n = net.split(".").reduce((a, x) => a * 256 + Number(x), 0);
    const ip = 203 * 2 ** 24 + 113 * 256 + 77;
    assert.ok(ip - n >= 0 && ip - n < 2 ** (32 - p), String(p));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ip: "192.168.1" }), "ip");
  throwsInput(() => mod.solve({ ip: "192.168.1.1/33" }), "ip");
  throwsInput(() => mod.solve({ ip: "192.168.1.1" }), "mask");
  throwsInput(() => mod.solve({ ip: "192.168.1.1", mask: "255.0.255.0" }), "mask");
  throwsInput(() => mod.solve({ ip: "192.168.1.1/30", subnets: "4" }), "subnets");
});
