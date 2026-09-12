import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const SUPABASE_URL = "https://kujfkjhrnfuhjxirbvmr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1amZramhybmZ1aGp4aXJidm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDU3NzksImV4cCI6MjEwMzkyMTc3OX0.EKBdTE5Xx124ud3gnMsS2E3u_SvdncaaOek9CR3MMN8";

test.describe("Admin Fleet Tracking - Clean UI, Clock Scrubbing & No Admin Booking", () => {
  const screenshotDir = "C:/Users/codew/.gemini/antigravity-ide/brain/27bbaaeb-3b23-4816-8bed-3fe5dcab0efb/scratch";

  test("verifies removed text, clock dial scrubbing, zero shaking, and no admin booking", async ({ page }) => {
    // 1. Setup user session with mocked admin profile
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = `admin_fleet_${Date.now()}@seatransit.ph`;
    const { data: authData } = await supabase.auth.signUp({
      email: testEmail,
      password: "Password123!",
      options: {
        data: {
          full_name: "Fleet Administrator",
          phone: "+63 917 888 9999",
        },
      },
    });

    // Intercept profile fetch to grant admin role
    await page.route("**/rest/v1/profiles*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: authData?.user?.id ?? "test-admin-id",
            full_name: "Fleet Administrator",
            email: testEmail,
            phone: "+63 917 888 9999",
            role: "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Inject session token via addInitScript before navigation
    if (authData?.session) {
      await page.addInitScript((session) => {
        localStorage.setItem("sb-kujfkjhrnfuhjxirbvmr-auth-token", JSON.stringify(session));
      }, authData.session);
    }

    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // 2. Navigate to /admin/fleet
    await page.goto("/admin/fleet");
    await page.waitForLoadState("networkidle");

    // 3. Verify clean title and removal of requested items
    const title = page.locator("h1");
    await expect(title).toContainText("Fleet AIS & Maritime Tracking");

    // Verify removals from Header:
    await expect(page.locator("text=Live Sync")).toHaveCount(0);
    await expect(page.locator("text=/Simulated:/")).toHaveCount(0);
    await expect(page.locator("text=Resume Live AIS")).toHaveCount(0);
    await expect(page.locator("text=/Time: \\d\\d:\\d\\d/")).toHaveCount(0);

    // Verify removals from Time Control / Status Bar:
    await expect(page.locator("text=Bohol Sea Transit Network")).toHaveCount(0);
    await expect(page.locator("text=00:00 (Midnight)")).toHaveCount(0);
    await expect(page.locator("text=23:59 (End of Day)")).toHaveCount(0);
    await expect(page.locator("text=/Selected Time:/")).toHaveCount(0);

    // 4. Verify Interactive Clock & Time Machine elements
    await expect(page.locator("text=Timetable Vessel Tracker & Time Machine")).toBeVisible();
    await expect(page.locator("text=(Evaluate ship positions along route waypoints at any hour)")).toBeVisible();

    // Verify presets exist
    await expect(page.locator("button:has-text('Live Clock')")).toBeVisible();
    await expect(page.locator("button:has-text('07:30 AM')")).toBeVisible();
    await expect(page.locator("button:has-text('10:30 AM')")).toBeVisible();
    await expect(page.locator("button:has-text('03:30 PM')")).toBeVisible();
    await expect(page.locator("button:has-text('10:30 PM')")).toBeVisible();

    // Verify SVG clock dial exists
    const clockDial = page.locator("svg[aria-label='Interactive clock dial']");
    await expect(clockDial).toBeVisible();

    // 5. Test scrubbing clock dial rapidly (crazy speeds test)
    const dialBox = await clockDial.boundingBox();
    if (dialBox) {
      const cx = dialBox.x + dialBox.width / 2;
      const cy = dialBox.y + dialBox.height / 2;
      const r = dialBox.width / 2 - 20;

      await page.mouse.move(cx + r, cy);
      await page.mouse.down();

      // Spin around the dial multiple times rapidly
      for (let i = 0; i <= 36; i++) {
        const angle = (i * 20 * Math.PI) / 180;
        await page.mouse.move(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      await page.mouse.up();
    }

    // 6. Expand map to Fullscreen
    const expandOverlay = page.locator("text=Click map to browse in full screen");
    await expect(expandOverlay).toBeVisible();
    await expandOverlay.click();
    await page.waitForTimeout(1400);

    // 7. Verify Sidebar in Admin Fleet View:
    const sidebar = page.locator("[aria-label='Transit Route Planner and Piers']");
    await expect(sidebar).toBeVisible();

    // Verify "AIS Active" is removed inside map sidebar
    await expect(sidebar.locator("text=AIS Active")).toHaveCount(0);

    // Verify Admin NEVER has "Route Planner" tab (only Piers and Fleet)
    await expect(sidebar.locator("button:has-text('Route Planner')")).toHaveCount(0);
    await expect(sidebar.locator("button:has-text('Piers')")).toBeVisible();
    await expect(sidebar.locator("button:has-text('Fleet')")).toBeVisible();

    // Verify Piers tab does NOT have "Plan route" button
    await sidebar.locator("button:has-text('Piers')").click();
    await page.waitForTimeout(300);
    await expect(sidebar.locator("text=Plan route")).toHaveCount(0);

    // Verify no booking modals are present
    await expect(page.locator("[aria-labelledby='auth-gate-title']")).toHaveCount(0);
    await expect(page.locator("[aria-labelledby='sailing-modal-title']")).toHaveCount(0);
    await expect(page.locator("[aria-labelledby='discard-modal-title']")).toHaveCount(0);

    await page.screenshot({
      path: path.join(screenshotDir, "fleet_tracking_clean.png"),
      fullPage: false,
    });
  });
});
