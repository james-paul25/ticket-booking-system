import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const SUPABASE_URL = "https://kujfkjhrnfuhjxirbvmr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1amZramhybmZ1aGp4aXJidm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDU3NzksImV4cCI6MjEwMzkyMTc3OX0.EKBdTE5Xx124ud3gnMsS2E3u_SvdncaaOek9CR3MMN8";

test.describe("Full Booking, Bank Payment, Boarding Pass & Sync Flow", () => {
  const screenshotDir = "C:/Users/codew/.gemini/antigravity-ide/brain/27bbaaeb-3b23-4816-8bed-3fe5dcab0efb/scratch";

  test("end-to-end checkout with bank transfer, boarding pass sync, my tickets, and seat lock", async ({ page }) => {
    // 0. Pre-create and authenticate user session
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = `juan_${Date.now()}@seatransit.ph`;
    const { data: authData } = await supabase.auth.signUp({
      email: testEmail,
      password: "Password123!",
      options: {
        data: {
          full_name: "Juan Dela Cruz",
          phone: "+63 917 842 1099",
          address: "Tubigon, Bohol, Philippines",
        },
      },
    });

    // Go to homepage and inject the active auth token
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    if (authData?.session) {
      await page.evaluate((session) => {
        localStorage.setItem("sb-kujfkjhrnfuhjxirbvmr-auth-token", JSON.stringify(session));
      }, authData.session);
    }

    // 1. Navigate to schedule seat selection
    await page.goto("/schedules/tpl-tub-ceb-fc11-0500-2026-09-13");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(screenshotDir, "playwright_1_seat_stage.png") });

    // 2. Navigate to booking checkout with seat J3A in Business Class
    await page.goto("/booking/tpl-tub-ceb-fc11-0500-2026-09-13?seat=J3A&tier=business&amount=565");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Verify Review Page elements
    await expect(page.getByText("Review & Complete Payment")).toBeVisible();
    await expect(page.getByText("Back to Seat Selection")).toBeVisible();
    await expect(page.getByText("SEAT J3A")).toBeVisible();
    await expect(page.getByText("Business Class", { exact: true })).toBeVisible();

    // 2b. Test DirtyFormsModal on "Back to Seat Selection" click
    await page.getByText("Back to Seat Selection").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Leave seat selection?")).toBeVisible();
    await expect(page.getByText(/You have selected Seat J3A/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /keep my seat/i })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "playwright_2b_dirty_modal.png") });

    // Test "Keep My Seat" smoothly dismisses the modal
    await page.getByRole("button", { name: /keep my seat/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Leave seat selection?")).not.toBeVisible();

    // 2c. Test DirtyFormsModal on top bar link click (e.g. Trips)
    const tripsLink = page.locator("header").getByRole("link", { name: /trips/i });
    await tripsLink.click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Leave seat selection?")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "playwright_2c_topbar_dirty_modal.png") });

    // Test "Keep My Seat" stays on page
    await page.getByRole("button", { name: /keep my seat/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Leave seat selection?")).not.toBeVisible();
    await expect(page.getByText("Review & Complete Payment")).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "playwright_2_review_page.png") });

    // 3. Select Bank Transfer
    const changeMethodBtn = page.getByRole("button", { name: /change method/i });
    await changeMethodBtn.click();
    await page.waitForTimeout(250);

    const bankOption = page.getByText(/Bank Transfer/i);
    await bankOption.click();
    await page.waitForTimeout(250);

    // 4. Open checkout modal
    const payBtn = page.getByRole("button", { name: /pay with bank/i });
    await payBtn.click();
    await page.waitForTimeout(300);

    // 5. Verify Bank Modal Fields: Full Name, Card Number (jargon numbers), Security CVC, and NO phone/mpin
    await expect(page.locator("label:has-text('Full Name')")).toBeVisible();
    await expect(page.locator("label:has-text('Card Number')")).toBeVisible();
    await expect(page.locator("label:has-text('Security CVC')")).toBeVisible();
    await expect(page.locator("input[value='4532 8920 1482 7731']")).toBeVisible();
    await expect(page.locator("input[value='842']")).toBeVisible();
    await expect(page.getByText("MPIN / One-Time Passcode")).not.toBeVisible();
    await expect(page.getByText("GCash Mobile Number")).not.toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "playwright_3_bank_modal.png") });

    // 6. Authorize and Pay
    const authBtn = page.getByRole("button", { name: /authorize & pay/i });
    await authBtn.click();

    // 7. Wait for success screen
    await expect(page.getByText("Booking Confirmed & Ready")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Seat J3A Confirmed & Paid/i)).toBeVisible();

    // Verify "Back to Seat Selection" is REMOVED on confirmation screen!
    await expect(page.getByText("Back to Seat Selection")).not.toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "playwright_4_confirmed_screen.png") });

    // 8. Click "Open Digital Boarding Pass"
    const openPassBtn = page.getByRole("button", { name: /open digital boarding pass/i });
    await openPassBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // 9. Verify Boarding Pass Details
    await expect(page.getByText("Boarding Pass")).toBeVisible();
    await expect(page.getByText(/Seat J3A/i)).toBeVisible();
    await expect(page.getByText("Business Class", { exact: true })).toBeVisible();

    // Verify Total Fare Paid is formatted accurately and not NaN
    await expect(page.getByText("Total Fare Paid:")).toBeVisible();
    await expect(page.getByText("NaN")).not.toBeVisible();
    await expect(page.getByText(/₱565\.00/i)).toBeVisible();

    // Desktop check: wide horizontal layout
    const ticketDesktop = page.locator("#printable-ticket");
    const desktopBox = await ticketDesktop.boundingBox();
    expect(desktopBox).not.toBeNull();
    if (desktopBox) {
      expect(desktopBox.width).toBeGreaterThan(600);
    }
    await page.screenshot({ path: path.join(screenshotDir, "playwright_5_boarding_pass_desktop.png") });

    // Mobile check: resize to phone viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const ticketMobile = page.locator("#printable-ticket");
    const mobileBox = await ticketMobile.boundingBox();
    expect(mobileBox).not.toBeNull();
    if (mobileBox) {
      expect(mobileBox.width).toBeLessThan(400);
      expect(mobileBox.height).toBeGreaterThan(mobileBox.width);
    }
    await page.screenshot({ path: path.join(screenshotDir, "playwright_5b_boarding_pass_mobile.png") });

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);

    // 10. Check "View My Tickets"
    const myTicketsBtn = page.getByRole("link", { name: /view my tickets/i });
    await myTicketsBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByText("Activity & Bookings")).toBeVisible();
    await expect(page.getByText(/Seat J3A/i)).toBeVisible();
    await expect(page.getByText(/₱565\.00/i)).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "playwright_6_my_tickets_desktop.png") });

    // Mobile check for My Tickets
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, "playwright_6b_my_tickets_mobile.png") });
    await page.setViewportSize({ width: 1280, height: 800 });

    // 11. Check that the seat is now locked when returning to seat selection
    await page.goto("/schedules/tpl-tub-ceb-fc11-0500-2026-09-13");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // Verify that localStorage contains J3A allocated
    const allocatedSeats = await page.evaluate(() => {
      const stored = localStorage.getItem("seqbook_allocated_seats");
      return stored ? JSON.parse(stored) : {};
    });
    expect(allocatedSeats["tpl-tub-ceb-fc11-0500-2026-09-13"]).toContain("J3A");

    await page.screenshot({ path: path.join(screenshotDir, "playwright_7_seat_map_locked.png") });
  });
});
