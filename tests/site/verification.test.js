import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { verificationMeta } from "../../scripts/site-parts.mjs";
import { htmlFiles, read, rel, ROOT } from "./helpers.js";

test("وسم تحقق Google يظهر فقط عند وجود الرمز ويرفض القيم الخاطئة", () => {
  assert.equal(verificationMeta({}), "");
  assert.equal(verificationMeta({ googleSiteVerification: "  " }), "");
  const token = "AbCdEf0123456789_-xyzQWERTYuiop";
  assert.equal(verificationMeta({ googleSiteVerification: token }), `<meta name="google-site-verification" content="${token}">\n`);
  assert.throws(() => verificationMeta({ googleSiteVerification: '<meta name="google-site-verification" content="x">' }), /غير صالح/);
  assert.throws(() => verificationMeta({ googleSiteVerification: "short" }), /غير صالح/);
  assert.throws(() => verificationMeta({ googleSiteVerification: 'abc"def0123456789012345' }), /غير صالح/);
});

test("الوسم في الصفحة الرئيسية فقط ويطابق الإعداد", () => {
  const config = JSON.parse(read(join(ROOT, "site.config.json")));
  const token = (config.googleSiteVerification || "").trim();
  for (const f of htmlFiles().filter((p) => !rel(p).startsWith("vendor/"))) {
    const has = read(f).includes('name="google-site-verification"');
    assert.equal(has, rel(f) === "index.html" && !!token, rel(f));
  }
});
