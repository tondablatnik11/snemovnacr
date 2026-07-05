import { test, expect } from "@playwright/test";

test("AI chat page loads and shows suggested questions", async ({ page }) => {
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: /AI asistent/i })).toBeVisible();
  // Suggested questions are present
  await expect(page.getByText("Navrhované dotazy")).toBeVisible();
});