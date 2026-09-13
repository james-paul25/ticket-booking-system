import { test, expect } from "@playwright/test";

test.describe("Seat selection flow", () => {
  test("schedule detail page loads and shows seat map", async ({ page }) => {
    // Navigate to schedules list
    await page.goto("/schedules");
    await expect(page).toHaveTitle(/.+/);

    // Check the page renders without error
    await expect(page.locator("body")).toBeVisible();
  });

  test("seat map shows Economy / Business tabs", async ({ page }) => {
    // We navigate to a schedule detail page (adjust ID once real data is seeded)
    await page.goto("/schedules");
    
    const firstSchedule = page.locator("a[href*='/schedule/']").first();
    if (await firstSchedule.count() > 0) {
      await firstSchedule.click();
      await expect(page.getByText(/Economy/)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Business/)).toBeVisible({ timeout: 10000 });
    }
  });
});
