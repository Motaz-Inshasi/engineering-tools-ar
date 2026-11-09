import { test, expect } from "@playwright/test";
import { liveTools, watch, noOverflow, categories } from "./helpers.js";

const list = await liveTools();

test("الصفحة الرئيسية تعمل والبحث يصفّي الأدوات", async ({ page }) => {
  const problems = watch(page);
  await page.goto("./");
  await expect(page.locator("h1")).toBeVisible();
  const cards = page.locator("[data-search]");
  await expect(cards).toHaveCount(list.length);
  await page.fill("#home-search", "مشتقة");
  await expect(page.locator("#search-count")).toContainText("أداة");
  const visible = await page.locator("[data-search]:not([hidden])").count();
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(Math.max(2, list.length));
  await page.fill("#home-search", "zzzzqqq");
  await expect(page.locator("#search-count")).toContainText("لا توجد");
  expect(await noOverflow(page)).toBe(true);
  expect(problems).toEqual([]);
});

test("البحث من رأس الصفحة ينقل إلى الرئيسية مع الكلمة", async ({ page }) => {
  await page.goto(`tools/${list[0].slug}/`);
  await page.fill("#site-q", "مقاومة");
  await page.press("#site-q", "Enter");
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator("#home-search")).toHaveValue("مقاومة");
});

test("صفحة 404 تعمل بلا طلبات فاشلة غير الصفحة نفسها", async ({ page }) => {
  const problems = watch(page);
  const res = await page.goto("no-such-page/");
  expect(res.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("غير موجودة");
  expect(problems.filter((p) => !p.includes("no-such-page"))).toEqual([]);
});

test("الوضع الداكن يتبدّل", async ({ page }) => {
  await page.goto("./");
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click(".theme-toggle");
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(after).not.toBe(before);
});

for (const c of categories) {
  test(`صفحة التصنيف ${c.slug}`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(`category/${c.slug}/`);
    await expect(page.locator("h1")).toHaveText(c.title);
    expect(await noOverflow(page)).toBe(true);
    expect(problems).toEqual([]);
  });
}

test("كل أداة في السجل لها صفحة جاهزة", async () => {
  const { tools } = await import("./helpers.js");
  expect(list.map((t) => t.slug).sort()).toEqual(tools.map((t) => t.slug).sort());
});
