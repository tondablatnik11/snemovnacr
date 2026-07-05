import { test, expect } from "@playwright/test";

test("hlasovani list navigates to detail", async ({ page }) => {
  await page.goto("/hlasovani");
  const firstLink = page.locator("ul li a").first();
  if (await firstLink.count() > 0) {
    await firstLink.click();
    await expect(page).toHaveURL(/\/hlasovani\/\d+/);
  } else {
    test.skip(true, "žádná hlasování v DB");
  }
});