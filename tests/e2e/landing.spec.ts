import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Transparentní");
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Poslanci", exact: true }).first().click();
    await expect(page).toHaveURL(/\/poslanci/);
  });
});