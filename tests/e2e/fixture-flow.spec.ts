import { test, expect } from "@playwright/test";

test("fixture product can be generated and exported", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Generate draft" }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);
  await expect(page.getByText("Source facts")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "HTML" })).toBeVisible();
});
