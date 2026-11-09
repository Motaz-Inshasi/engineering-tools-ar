import { test, expect } from "@playwright/test";
import { liveTools, noOverflow } from "./helpers.js";

const list = await liveTools();

test("لوحة المفاتيح: يمكن الوصول إلى زر الحساب وتشغيله", async ({ page }) => {
  const t = list[0];
  await page.goto(`tools/${t.slug}/`);
  await expect(page.locator("body[data-ready='1']")).toHaveCount(1);
  await page.click("#example-btn");
  await page.locator("#tool-form button[type=submit]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#out-success")).toBeVisible();
});

test("كل حقول الإدخال لها تسمية", async ({ page }) => {
  for (const t of list) {
    await page.goto(`tools/${t.slug}/`);
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll("input, select, textarea")].filter((el) => {
      if (el.type === "hidden") return false;
      const id = el.id;
      return !(id && document.querySelector(`label[for="${id}"]`)) && !el.getAttribute("aria-label");
    }).map((el) => el.name || el.id));
    expect(unlabeled, t.slug).toEqual([]);
  }
});

test("لا تمرير أفقي بعد عرض النتائج في كل الأدوات", async ({ page }) => {
  for (const t of list) {
    await page.goto(`tools/${t.slug}/`);
    await expect(page.locator("body[data-ready='1']")).toHaveCount(1);
    await page.click("#example-btn");
    await expect(page.locator("#output")).toBeVisible();
    expect(await noOverflow(page), t.slug).toBe(true);
  }
});
