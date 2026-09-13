import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const SUPABASE_URL = "https://kujfkjhrnfuhjxirbvmr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1amZramhybmZ1aGp4aXJidm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDU3NzksImV4cCI6MjEwMzkyMTc3OX0.EKBdTE5Xx124ud3gnMsS2E3u_SvdncaaOek9CR3MMN8";

test.describe("Admin Overview Redesign & Quality Verification", () => {
  const screenshotDir = "C:/Users/codew/.gemini/antigravity-ide/brain/27bbaaeb-3b23-4816-8bed-3fe5dcab0efb/scratch";

  test("renders clean admin overview with preserved functionalities and zero AI slop", async ({ page }) => {
    // 1. Setup user session with mocked admin profile
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = `admin_tester_${Date.now()}@seatransit.ph`;
    const { data: authData } = await supabase.auth.signUp({
      email: testEmail,
      password: "Password123!",
      options: {
        data: {
          full_name: "Operations Administrator",
          phone: "+63 917 123 4567",
        },
      },
    });

    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));

    // Intercept profile fetch to grant admin role
    await page.route("**/rest/v1/profiles*", async (route) => {
      console.log(`[INTERCEPT PROFILES] URL: ${route.request().url()}, Method: ${route.request().method()}`);
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: authData?.user?.id ?? "test-admin-id",
            full_name: "Operations Administrator",
            email: testEmail,
            phone: "+63 917 123 4567",
            role: "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 2. Inject session token via addInitScript before navigation
    if (authData?.session) {
      await page.addInitScript((session) => {
        localStorage.setItem("sb-kujfkjhrnfuhjxirbvmr-auth-token", JSON.stringify(session));
      }, authData.session);
    }

    // 3. Navigate to /admin directly with authenticated session
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // 4. Assert header & navigation actions
    const overview = page.getByTestId("admin-overview");
    await expect(overview.getByRole("heading", { name: "Admin Overview", level: 1 })).toBeVisible();
    await expect(overview.getByRole("link", { name: /new schedule/i })).toHaveAttribute("href", "/admin/schedules/create");
    await expect(overview.getByRole("link", { name: /view queue/i })).toHaveAttribute("href", "/admin/queue");
    await expect(overview.getByRole("link", { name: /fleet tracking/i })).toHaveAttribute("href", "/admin/fleet");
    await expect(overview.getByRole("link", { name: /sequential demo/i })).toHaveAttribute("href", "/admin/sequential-demo");

    // 5. Assert KPI metrics
    await expect(overview.getByText("Total Revenue")).toBeVisible();
    await expect(overview.getByText("Confirmed Bookings")).toBeVisible();
    await expect(overview.getByText("Active Schedules")).toBeVisible();
    await expect(overview.getByText("Registered Users")).toBeVisible();

    // 6. Assert Booking Queue Status section
    await expect(overview.getByRole("heading", { name: "Booking Queue Status" })).toBeVisible();
    await expect(overview.getByRole("link", { name: /processing logs/i })).toHaveAttribute("href", "/admin/processing-logs");
    await expect(overview.getByText("Queued Requests")).toBeVisible();
    await expect(overview.getByText("Execution Slot")).toBeVisible();
    await expect(overview.getByText("Queue Outcomes")).toBeVisible();

    // 7. Assert Recent Bookings Table
    await expect(overview.getByRole("heading", { name: "Recent Bookings" })).toBeVisible();
    await expect(overview.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/admin/bookings");
    await expect(overview.getByRole("columnheader", { name: "Reference" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Passenger" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Route" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Seat" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Fare" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(overview.getByRole("columnheader", { name: "Time" })).toBeVisible();

    // 8. Strict AI Slop & Technical Marketing Check (MUST NOT BE PRESENT)
    await expect(page.locator("text=Database guarantee")).not.toBeVisible();
    await expect(page.locator("text=uq_single_processing_slot")).not.toBeVisible();
    await expect(page.locator("text=Automatic inventory sync")).not.toBeVisible();
    await expect(page.locator("text=Automatic RLS audit trail")).not.toBeVisible();
    await expect(page.locator("text=Supabase Auth Profiles")).not.toBeVisible();
    await expect(page.locator("text=Concurrency Protection")).not.toBeVisible();
    await expect(page.locator("text=At any instant, at most one row can be in processing status")).not.toBeVisible();

    // 9. Take Desktop screenshot
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "admin_overview_desktop.png"), fullPage: true });

    // 10. Take Mobile screenshot
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "admin_overview_mobile.png"), fullPage: true });

    // 11. Toggle dark mode and take Dark Mode desktop screenshot
    await page.setViewportSize({ width: 1280, height: 900 });
    const themeBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotDir, "admin_overview_desktop_dark.png"), fullPage: true });
    }
  });
});
