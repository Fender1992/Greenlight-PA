import { test, expect } from "@playwright/test";

test.describe("PA creation flow", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard/pa/new");
    await expect(page).toHaveURL(/(login|signup)/);
  });
});
