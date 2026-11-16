import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tools, watch, noOverflow, ROOT } from "./helpers.js";
import { LANGS, RTL } from "../../scripts/i18n.mjs";

const releasedPath = join(ROOT, "i18n", "released.json");
const released = existsSync(releasedPath) ? JSON.parse(readFileSync(releasedPath, "utf8")) : {};
const langs = LANGS.filter((l) => (released[l] || []).length);

for (const lang of langs) {
  const list = tools.filter((t) => released[lang].includes(t.category) && existsSync(join(ROOT, `lib-${lang}`, t.category, `${t.slug}.js`)));
  test.describe(`${lang}`, () => {
    test("الصفحة الرئيسية للغة واتجاهها وقائمة اللغات", async ({ page }) => {
      const problems = watch(page);
      await page.goto(`${lang}/`);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("html")).toHaveAttribute("dir", RTL.has(lang) ? "rtl" : "ltr");
      await expect(page.locator(".cat-tiles a").first()).toBeVisible();
      await page.locator(".lang-menu summary").click();
      await page.locator('.lang-menu a[hreflang="ar"]').click();
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      expect(await noOverflow(page)).toBe(true);
      expect(problems).toEqual([]);
    });

    for (const t of list) {
      test(`${t.slug}: المثال المحلول يعمل`, async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "اختبار اللغات على الحاسوب فقط");
        const problems = watch(page);
        await page.goto(`${lang}/tools/${t.slug}/`);
        await expect(page.locator("body[data-ready='1']")).toHaveCount(1);
        await page.click("#example-btn");
        await expect(page.locator("#output")).toBeVisible();
        await expect(page.locator("#out-error")).toBeHidden();
        await expect(page.locator("#out-results > div").first()).toBeVisible();
        const shown = await page.locator("#output").innerText();
        expect(shown).not.toMatch(/&#\d+;|&amp;|&lt;|&gt;|NaN|\[object/);
        expect(shown).not.toMatch(/^undefined$|: undefined$/m);
        if (!RTL.has(lang)) expect(shown).not.toMatch(/[ء-ي]/);
        expect(await noOverflow(page)).toBe(true);
        expect(problems).toEqual([]);
      });
    }
  });
}
