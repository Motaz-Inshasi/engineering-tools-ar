import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { existsSync } from "node:fs";
import jsQR from "jsqr";
import { donateHtml, donateUrl, donateInfo, isTronAddress, qrMatrix, qrSvg } from "../../scripts/site-parts.mjs";
import { htmlFiles, read, rel, ROOT } from "./helpers.js";

const ADDR = "TPJ43BMAikPH6H1cZyAakXPk57GEag4Ujo";
const cfg = (d) => ({ donate: { label: "ادعم الموقع", text: "نص", ...d } });

test("التحقق من عنوان TRON بالمجموع الاختباري", () => {
  assert.equal(isTronAddress(ADDR), true);
  assert.equal(isTronAddress("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7"), true);
  assert.equal(isTronAddress(ADDR.slice(0, 10) + "Q" + ADDR.slice(11)), false);
  assert.equal(isTronAddress(ADDR.slice(0, -1)), false);
  assert.equal(isTronAddress("0x" + "a".repeat(40)), false);
  assert.equal(isTronAddress(ADDR.replace("T", "A")), false);
  assert.equal(isTronAddress(""), false);
  assert.equal(isTronAddress(ADDR.toLowerCase()), false);
});

test("الزر والصفحة مخفيان ما لم يكن enabled = true حتى مع وجود العنوان", () => {
  assert.equal(donateHtml(cfg({ enabled: false, usdtTrc20: ADDR })), "");
  assert.equal(donateHtml(cfg({ usdtTrc20: ADDR })), "");
  assert.equal(donateHtml(cfg({ enabled: true })), "");
  assert.equal(donateHtml({}), "");
  const html = donateHtml(cfg({ enabled: true, usdtTrc20: ADDR }), "../../");
  assert.match(html, /^<a class="donate-top" href="\.\.\/\.\.\/support\/"/);
  assert.match(html, /title="نص"/);
});

test("الإعدادات الخاطئة تُرفض برسالة واضحة قبل النشر", () => {
  assert.throws(() => donateInfo(cfg({ enabled: true, usdtTrc20: ADDR.slice(0, 10) + "Q" + ADDR.slice(11) })), /غير صالح/);
  assert.throws(() => donateInfo(cfg({ enabled: true, binancePayId: "abc" })), /أرقاماً/);
  assert.throws(() => donateUrl(cfg({ url: "http://ko-fi.com/x" })), /https/);
  assert.throws(() => donateUrl(cfg({ url: "javascript:alert(1)" })), /https/);
  assert.equal(donateInfo(cfg({ enabled: true, binancePayId: "123456789" })).enabled, true);
});

test("تحقق مستقل: رمز QR المولّد يُقرأ بقارئ مستقل ويعطي العنوان حرفياً", () => {
  for (const text of [ADDR, "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", "123456789"]) {
    const m = qrMatrix(text);
    const scale = 6, quiet = 4, n = m.length, size = (n + 2 * quiet) * scale;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    m.forEach((row, r) => row.forEach((dark, c) => {
      if (!dark) return;
      for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
        const i = (((r + quiet) * scale + y) * size + (c + quiet) * scale + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }));
    const res = jsQR(data, size, size);
    assert.ok(res, `QR for ${text} not decodable`);
    assert.equal(res.data, text);
  }
  const svg = qrSvg(ADDR, "رمز");
  assert.match(svg, /^<svg class="qr" viewBox="0 0 37 37" role="img" aria-label="رمز"/);
  assert.match(svg, /fill="#ffffff"/);
});

test("حالة الصفحات المولّدة تطابق الإعداد الحالي", () => {
  const config = JSON.parse(read(join(ROOT, "site.config.json")));
  const info = donateInfo(config);
  assert.equal(existsSync(join(ROOT, "support", "index.html")), info.enabled);
  for (const f of htmlFiles().filter((p) => !rel(p).startsWith("vendor/") && rel(p) !== "404.html")) {
    const html = read(f);
    assert.equal(html.includes('class="donate-top"'), info.enabled, rel(f));
    if (info.enabled) {
      const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf("</header>"));
      assert.ok(header.includes('class="donate-top"'), `${rel(f)}: button must be inside the header`);
    }
  }
  if (info.enabled && info.usdt) {
    const page = read(join(ROOT, "support", "index.html"));
    assert.ok(page.includes(`value="${info.usdt}"`));
    assert.match(page, /TRC20/);
    assert.match(page, /<svg class="qr"/);
  }
});
