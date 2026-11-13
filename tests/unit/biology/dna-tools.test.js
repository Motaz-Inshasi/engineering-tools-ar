import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/biology/dna-tools.js";
import { CODONS } from "../../../lib/biology/codons.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const val = (r, label) => r.results.find((x) => x.label.startsWith(label)).value;

test("المتممة والمتممة المعكوسة والنسخ", () => {
  const r = mod.solve({ seq: "ATGC", strand: "coding", frame: "1" });
  assert.equal(val(r, "السلسلة المتممة"), "TACG");
  assert.equal(val(r, "المتممة المعكوسة"), "GCAT");
  assert.equal(val(r, "mRNA"), "AUGC");
});

test("السلسلة القالب تعطي البروتين نفسه", () => {
  const a = mod.solve({ seq: "ATGTTTGGGTAA", strand: "coding", frame: "aug" });
  const b = mod.solve({ seq: "TACAAACCCATT", strand: "template", frame: "aug" });
  const c = mod.solve({ seq: "AUGUUUGGGUAA", strand: "rna", frame: "aug" });
  assert.equal(val(a, "البروتين (رمز أحادي)"), "MFG*");
  assert.equal(val(b, "البروتين (رمز أحادي)"), "MFG*");
  assert.equal(val(c, "البروتين (رمز ثلاثي)"), "Met-Phe-Gly-Stop");
});

test("إطارات القراءة ونسبة GC ودرجة الانصهار", () => {
  assert.equal(val(mod.solve({ seq: "CATGAAATAG", strand: "coding", frame: "aug" }), "البروتين (رمز أحادي)"), "MK*");
  assert.equal(val(mod.solve({ seq: "CATGAAATAG", strand: "coding", frame: "2" }), "البروتين (رمز أحادي)"), "MK*");
  assert.equal(val(mod.solve({ seq: "GGGG", strand: "coding", frame: "1" }), "نسبة GC"), "100%");
  assert.equal(val(mod.solve({ seq: "ATGCATGC", strand: "coding", frame: "1" }), "درجة الانصهار"), "24 °C");
  assert.equal(Object.keys(CODONS).length, 64);
  close(parseFloat(val(mod.solve({ seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }), "درجة الانصهار")), 64.9 + 41 * (22 - 16.4) / 39, 0.01);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ seq: "ATGN", strand: "coding" }), "seq");
  throwsInput(() => mod.solve({ seq: "AUGT", strand: "coding" }), "seq");
  throwsInput(() => mod.solve({ seq: "ATGC", strand: "rna" }), "strand");
  throwsInput(() => mod.solve({ seq: "CCCGGG", strand: "coding", frame: "aug" }), "frame");
  throwsInput(() => mod.solve({ seq: "", strand: "coding" }), "seq");
});
