import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { liveTools, watch, noOverflow, categories, ROOT } from "./helpers.js";

const list = await liveTools();
const ready = (page) => expect(page.locator("body[data-ready='1']")).toHaveCount(1);

test("الصفحة الرئيسية تعرض شبكة الأقسام بأيقوناتها وتخفيها أثناء البحث", async ({ page }) => {
  const problems = watch(page);
  await page.goto("./");
  const tiles = page.locator(".cat-tiles a");
  await expect(tiles).toHaveCount(categories.length);
  await expect(page.locator(".cat-tiles a svg")).toHaveCount(categories.length);
  await expect(page.locator("#browse")).toBeVisible();
  await page.fill("#home-search", "زكاة");
  await expect(page.locator("#browse")).toBeHidden();
  await expect(page.locator("[data-search]:not([hidden])").first()).toBeVisible();
  await page.fill("#home-search", "");
  await expect(page.locator("#browse")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  expect(problems).toEqual([]);
});

test("الحساب الفوري: بعد أول حساب يتحدّث الناتج عند تعديل المدخلات", async ({ page }) => {
  await page.goto("tools/ohms-law/");
  await ready(page);
  await expect(page.locator("#live-hint")).toBeHidden();
  await page.click("#example-btn");
  await expect(page.locator("#out-results")).toContainText("9.4 V");
  await expect(page.locator("#live-hint")).toBeVisible();
  await page.fill("#in-R", "1000");
  await expect(page.locator("#out-results")).toContainText("20 V");
});

test("رابط المشاركة يعيد ملء المدخلات ويحسب الناتج مباشرة", async ({ page }) => {
  await page.goto("tools/quadratic/");
  await ready(page);
  await page.fill("#in-a", "1");
  await page.fill("#in-b", "-5");
  await page.fill("#in-c", "6");
  await page.click("#tool-form button[type=submit]");
  await expect(page.locator("#out-results")).toContainText("3");
  const url = page.url();
  expect(url).toContain("#");
  expect(url).toContain("b=-5");
  const other = await page.context().newPage();
  await other.goto(url);
  await ready(other);
  await expect(other.locator("#in-b")).toHaveValue("-5");
  await expect(other.locator("#out-success")).toBeVisible();
  await expect(other.locator("#out-results")).toContainText("(2.5, -0.25)");
});

test("زر المسح يوقف الحساب الفوري ويزيل القيم من الرابط", async ({ page }) => {
  await page.goto("tools/ohms-law/");
  await ready(page);
  await page.click("#example-btn");
  await expect(page.locator("#live-hint")).toBeVisible();
  await page.click("#tool-form button[type=reset]");
  await expect(page.locator("#output")).toBeHidden();
  await expect(page.locator("#live-hint")).toBeHidden();
  expect(page.url()).not.toContain("#");
});

test("آخر الأدوات المستخدمة تظهر في الصفحة الرئيسية", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#recent")).toBeHidden();
  await page.goto("tools/fractions/");
  await ready(page);
  await page.goto("tools/zakat/");
  await ready(page);
  await page.goto("./");
  await expect(page.locator("#recent")).toBeVisible();
  const links = page.locator("#recent a");
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveAttribute("href", "tools/zakat/");
});

test("صفحة التواصل تعمل والبريد يصبح رابط mailto صحيحاً", async ({ page }) => {
  test.skip(!existsSync(join(ROOT, "about", "index.html")), "صفحة التواصل غير مفعّلة");
  const problems = watch(page);
  await page.goto(list[0] ? `tools/${list[0].slug}/` : "./");
  await page.click(".about-top");
  await expect(page).toHaveURL(/about\/$/);
  await expect(page.locator("h1")).toBeVisible();
  const btn = page.locator(".email-btn");
  await expect(btn).toHaveAttribute("href", /^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
  await expect(page.locator(".email-line .email-link")).toHaveAttribute("href", /^mailto:/);
  const html = await page.content();
  expect(await noOverflow(page)).toBe(true);
  expect(html).toContain("mailto:");
  expect(problems).toEqual([]);
});

test("كل صفحة أداة تعرض أيقونة قسمها وأزرار المشاركة والطباعة", async ({ page }) => {
  for (const t of list.slice(0, 12)) {
    await page.goto(`tools/${t.slug}/`);
    await expect(page.locator(".page-head .badge-ic svg")).toHaveCount(1);
    await expect(page.locator("#share-btn")).toHaveCount(1);
    await expect(page.locator("#print-btn")).toHaveCount(1);
  }
});
