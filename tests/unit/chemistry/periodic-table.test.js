import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/periodic-table.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const find = (el) => mod.solve({ el });
const get = (r, label) => {
  const x = r.results.find((y) => y.label === label);
  return x ? x.value : undefined;
};
const CORE = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };

function electronsIn(cfg) {
  let total = 0;
  const m = cfg.match(/^\[(\w+)\]\s*(.*)$/);
  let rest = cfg;
  if (m) { total += CORE[m[1]]; rest = m[2]; }
  for (const part of rest.split(" ").filter(Boolean)) {
    const p = part.match(/^(\d)([spdf])(\d+)$/);
    assert.ok(p, `bad orbital «${part}» in «${cfg}»`);
    total += Number(p[3]);
  }
  return total;
}

test("توزيعات إلكترونية معروفة", () => {
  assert.equal(get(find("Fe"), "التوزيع الإلكتروني"), "[Ar] 3d6 4s2");
  assert.equal(get(find("Cu"), "التوزيع الإلكتروني"), "[Ar] 3d10 4s1");
  assert.equal(get(find("Na"), "التوزيع الإلكتروني"), "[Ne] 3s1");
  assert.equal(get(find("H"), "التوزيع الإلكتروني"), "1s1");
  assert.equal(get(find("Ne"), "التوزيع الإلكتروني"), "[He] 2s2 2p6");
  assert.equal(get(find("Cr"), "التوزيع الإلكتروني"), "[Ar] 3d5 4s1");
  assert.equal(get(find("Pt"), "التوزيع الإلكتروني"), "[Xe] 4f14 5d9 6s1");
  assert.equal(get(find("Kr"), "التوزيع الإلكتروني"), "[Ar] 3d10 4s2 4p6");
});

test("مجموعة ودورة وكتلة وإلكترونات تكافؤ", () => {
  const fe = find("Fe");
  assert.equal(get(fe, "المجموعة"), "8");
  assert.equal(get(fe, "الدورة"), "4");
  assert.equal(get(fe, "الكتلة (block)"), "d-block");
  assert.equal(get(fe, "إلكترونات التكافؤ"), undefined);
  assert.equal(get(find("Cl"), "إلكترونات التكافؤ"), "7");
  assert.equal(get(find("He"), "إلكترونات التكافؤ"), "2");
  assert.equal(get(find("Na"), "إلكترونات التكافؤ"), "1");
  assert.equal(get(find("Au"), "المجموعة"), "11");
  assert.equal(get(find("Au"), "الكتلة الذرية"), "196.97 u");
  assert.equal(get(find("La"), "المجموعة"), "لانثانيدات");
  assert.equal(get(find("U"), "المجموعة"), "أكتينيدات");
  assert.equal(get(find("U"), "الكتلة (block)"), "f-block");
});

test("البحث بالرمز والاسم والعدد الذري", () => {
  for (const q of ["حديد", "iron", "IRON", "Fe", "fe", "26", "٢٦"]) {
    assert.equal(get(find(q), "الرمز"), "Fe", `query ${q}`);
  }
  assert.equal(get(find("79"), "الرمز"), "Au");
  assert.equal(get(find("ذهب"), "الرمز"), "Au");
  assert.equal(get(find("Sodium"), "العدد الذري Z"), "11");
});

test("كل العناصر: مجموع الإلكترونات يساوي Z", () => {
  for (let z = 1; z <= 118; z++) {
    const r = find(String(z));
    const cfg = get(r, "التوزيع الإلكتروني");
    assert.equal(electronsIn(cfg), z, `Z=${z} ${cfg}`);
  }
});

test("الجدول الدوري: الأبعاد والتظليل", () => {
  const r = find("Fe");
  const t = r.blocks[0];
  assert.equal(t.type, "table");
  assert.equal(t.ltr, true);
  assert.equal(t.head.length, 18);
  assert.equal(t.rows.length, 9);
  assert.ok(t.rows.every((row) => row.length === 18));
  const cells = t.rows.flat().filter((c) => c !== null);
  assert.equal(cells.length, 118);
  const selected = cells.filter((c) => c.color === "#d32f2f");
  assert.equal(selected.length, 1);
  assert.equal(selected[0].text, "Fe");
  assert.equal(t.rows[3][7].text, "Fe");
  assert.equal(t.rows[7][2].text, "La");
  assert.equal(t.rows[8][2].text, "Ac");
  assert.equal(t.rows[0][0].text, "H");
  assert.equal(t.rows[0][1], null);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => find("Xx"), "el");
  throwsInput(() => find("119"), "el");
  throwsInput(() => find("   "), "el");
});
