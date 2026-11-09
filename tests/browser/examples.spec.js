import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { liveTools, watch, noOverflow, ROOT } from "./helpers.js";

const list = await liveTools();

for (const t of list) {
  test.describe(t.slug, () => {
    test("تحميل الصفحة والمثال المحلول والنسخ", async ({ page, context }, info) => {
      const problems = watch(page);
      await page.goto(`tools/${t.slug}/`);
      await expect(page.locator("h1")).toHaveText(t.title);
      await expect(page.locator("body[data-ready='1']")).toHaveCount(1);
      await expect(page.locator(".formula .katex").first()).toBeVisible();
      await page.click("#example-btn");
      await expect(page.locator("#output")).toBeVisible();
      await expect(page.locator("#out-error")).toBeHidden();
      await expect(page.locator("#out-results > div").first()).toBeVisible();
      const shown = await page.locator("#output").innerText();
      expect(shown).not.toMatch(/&#\d+;|&amp;|&lt;|&gt;|undefined|NaN|\[object/);
      if (info.project.name === "desktop") {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.click("#copy-btn");
        await expect(page.locator("#copy-status")).toHaveText("تم النسخ");
        const text = await page.evaluate(() => navigator.clipboard.readText());
        for (const e of t.meta.example.expect || []) expect(text).toContain(e);
      }
      expect(await noOverflow(page)).toBe(true);
      const dir = join(ROOT, "tests", "screenshots", info.project.name);
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, `${t.slug}.png`), fullPage: true });
      expect(problems).toEqual([]);
    });

    test("رسالة خطأ للمدخلات غير الصحيحة", async ({ page }) => {
      const problems = watch(page);
      await page.goto(`tools/${t.slug}/`);
      await expect(page.locator("body[data-ready='1']")).toHaveCount(1);
      for (const [k, v] of Object.entries(t.meta.invalid.values)) {
        const el = page.locator(`#tool-form [name="${k}"]`);
        const tag = await el.evaluate((e) => e.tagName + ":" + (e.type || ""));
        if (tag.startsWith("SELECT")) await el.selectOption(String(v));
        else if (tag.endsWith("checkbox")) await el.setChecked(!!v);
        else await el.fill(String(v));
      }
      await page.click("#tool-form button[type=submit]");
      await expect(page.locator("#out-error")).toBeVisible();
      const msg = await page.locator("#out-error").textContent();
      expect(msg).toMatch(/[؀-ۿ]/);
      expect(msg).not.toContain("غير متوقع");
      expect(problems).toEqual([]);
    });
  });
}
