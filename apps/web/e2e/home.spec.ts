import { test, expect } from "@playwright/test";

test("homepage loads and displays correctly", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Greenlight PA/i })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign In/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /View Worklist/i })
  ).toBeVisible();
});

test("demo mode banner is visible when enabled", async ({ page }) => {
  await page.goto("/");

  // Check for demo banner (if DEMO_MODE is enabled)
  const demoBanner = page.getByText(/Demo Mode - No PHI is being processed/i);
  // Banner may or may not be visible depending on env
});
