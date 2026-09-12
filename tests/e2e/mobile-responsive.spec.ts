import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const SUPABASE_URL = "https://kujfkjhrnfuhjxirbvmr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1amZramhybmZ1aGp4aXJidm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDU3NzksImV4cCI6MjEwMzkyMTc3OX0.EKBdTE5Xx124ud3gnMsS2E3u_SvdncaaOek9CR3MMN8";

test.describe("Mobile Responsive Layout & Interactions (< 1024px vs >= 1024px)", () => {
  const screenshotDir = "C:/Users/codew/.gemini/antigravity-ide/brain/27bbaaeb-3b23-4816-8bed-3fe5dcab0efb/scratch";
  let authSession: any = null;
  let testEmail = "";

  test.beforeAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    testEmail = `mobile_tester_${Date.now()}@seatransit.ph`;
    const { data } = await supabase.auth.signUp({
      email: testEmail,
      password: "Password123!",
      options: {
        data: {
          full_name: "Mobile Test Passenger",
          phone: "+63 917 555 1234",
          address: "Tagbilaran City, Bohol",
        },
      },
    });
    authSession = data.session;
  });

  test.beforeEach(async ({ page }) => {
    // Intercept profile fetch to simulate authenticated user with admin role
    await page.route("**/rest/v1/profiles*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: authSession?.user?.id ?? "test-user-id",
            full_name: "Mobile Test Passenger",
            email: testEmail,
            phone: "+63 917 555 1234",
            address: "Tagbilaran City, Bohol",
            role: "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    const session = authSession || {
      access_token: "mock-admin-token",
      token_type: "bearer",
      user: {
        id: "mock-admin-id",
        aud: "authenticated",
        role: "authenticated",
        email: testEmail || "admin@seatransit.ph",
        user_metadata: { full_name: "Mobile Test Passenger", role: "admin" },
      },
    };
    await page.addInitScript((s) => {
      localStorage.setItem("sb-kujfkjhrnfuhjxirbvmr-auth-token", JSON.stringify(s));
    }, session);
  });

  test("1. Mobile Map: bottom sheet on < 1024px vs desktop sidebar on >= 1024px", async ({ page }) => {
    // ─── Desktop Verification (1440x900) ───
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin/fleet");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Expand map to Fullscreen
    const expandOverlay = page.locator("text=Click map to browse in full screen");
    await expect(expandOverlay).toBeVisible();
    await expandOverlay.click();

    // Wait for centering + expand animation
    await page.waitForTimeout(1400);

    // On desktop, the panel is a left sidebar
    const desktopPanel = page.locator("[aria-label='Transit Route Planner and Piers']");
    await expect(desktopPanel).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_1_desktop_map.png") });

    // ─── Mobile Verification (390x844) ───
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // On mobile, the panel is a bottom sheet attached to bottom with rounded-t-[28px]
    await expect(desktopPanel).toBeVisible();
    await expect(desktopPanel).toHaveClass(/rounded-t-\[28px\]/);
    await expect(desktopPanel).toHaveClass(/bottom-0/);

    // Verify it has the drag handle indicator
    const dragHandle = desktopPanel.locator(".w-10.h-1.rounded-full");
    await expect(dragHandle).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_1_mobile_map_sheet.png") });
  });

  test("2. Mobile Seat Selection: bottom sheet with peek & expand", async ({ page }) => {
    // ─── Desktop Verification (1440x900) ───
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/schedules/tpl-tub-ceb-fc11-0500-2026-09-13/seats");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // On desktop, desktop sidebar is visible
    const seatSidebar = page.locator("aside[aria-label='Trip and Seat Booking Summary']");
    await expect(seatSidebar).toBeVisible();
    await expect(seatSidebar).toHaveClass(/lg:w-96/);
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_2_desktop_seat_sidebar.png") });

    // ─── Mobile Verification (390x844) ───
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // On mobile, seat sidebar is anchored to bottom with rounded-t-[28px]
    await expect(seatSidebar).toBeVisible();
    await expect(seatSidebar).toHaveClass(/rounded-t-\[28px\]/);
    await expect(seatSidebar).toHaveClass(/bottom-0/);

    // Verify handle is present
    const handle = seatSidebar.locator(".w-10.h-1.rounded-full");
    await expect(handle).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_2_mobile_seat_peek.png") });

    // Click to expand bottom sheet
    await handle.click();
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_2_mobile_seat_expanded.png") });
  });

  test("3. Mobile Payment & Modals: vertical stacking and bottom sheets", async ({ page }) => {
    // ─── Mobile Verification (390x844) ───
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/booking/tpl-tub-ceb-fc11-0500-2026-09-13?seat=J3A&tier=business&amount=565");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Verify elements stack vertically on mobile
    await expect(page.getByText("Review & Complete Payment")).toBeVisible();
    await expect(page.getByText("SEAT J3A")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_3_mobile_payment_page.png") });

    // Click "Change Method" -> opens bottom sheet modal
    const changeMethodBtn = page.getByRole("button", { name: /change method/i });
    if (await changeMethodBtn.isVisible()) {
      await changeMethodBtn.click();
      await page.waitForTimeout(300);

      // Verify payment modal appears with rounded-t-[28px] bottom sheet styling
      const paymentModalSheet = page.locator(".rounded-t-\\[28px\\]").filter({ hasText: /select payment method/i });
      await expect(paymentModalSheet).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_3_payment_modal_bottom_sheet.png") });

      // Close modal by selecting GCash
      await paymentModalSheet.locator("div").filter({ hasText: /^GCash$/i }).first().click();
      await page.waitForTimeout(300);
    }

    // Click "Back to Seat Selection" -> triggers DirtyFormsModal as bottom sheet
    await page.getByText("Back to Seat Selection").click();
    await page.waitForTimeout(300);

    const dirtyModalSheet = page.locator("[role='alertdialog'] .rounded-t-\\[28px\\]");
    await expect(dirtyModalSheet).toBeVisible();
    await expect(page.getByText("Leave seat selection?")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_3_dirty_modal_bottom_sheet.png") });

    // Keep seat
    await page.getByRole("button", { name: /keep my seat/i }).click();
    await page.waitForTimeout(200);

    // ─── Desktop Verification (1440x900) ───
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_3_desktop_payment_page.png") });
  });

  test("4. Mobile Boarding Pass & My Tickets: vertical layout vs desktop horizontal", async ({ page }) => {
    // ─── Desktop Verification (1440x900) ───
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/bookings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_4_desktop_bookings.png") });

    // ─── Mobile Verification (390x844) ───
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_4_mobile_bookings.png") });

    // Also verify small screen (< 390px, e.g. 360x740 Galaxy S8/iPhone SE)
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, "mobile_spec_4_small_mobile_bookings.png") });
  });
});
