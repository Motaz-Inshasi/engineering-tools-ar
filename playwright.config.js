import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.TEST_PORT || 4317);
const LIVE = process.env.LIVE_URL;

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: LIVE || `http://localhost:${PORT}/test-repo/`,
    channel: process.env.PW_CHANNEL || "chrome",
    headless: true,
    locale: "ar"
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } }
  ],
  webServer: LIVE ? undefined : {
    command: `node scripts/serve.mjs --port ${PORT} --base /test-repo/`,
    url: `http://localhost:${PORT}/test-repo/`,
    reuseExistingServer: false,
    timeout: 20000
  }
});
