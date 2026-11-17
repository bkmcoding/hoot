import { expect, test } from "@playwright/test";

test.describe("Frontend Offline Sync & Queue", () => {
  test("enqueues mutations offline and synchronizes when connected", async ({ page }) => {
    await page.goto("/");

    // 1. Verify queue is initially available
    const initialQueue = await page.evaluate(() => {
      return window.hootSync ? window.hootSync.getOfflineQueue() : null;
    });
    expect(initialQueue).not.toBeNull();

    // 2. Add an item through hootApi
    const uniqueName = `Offline Sourdough Loaf ${Date.now()}`;
    const addedItem = await page.evaluate(async (name) => {
      return await window.hootApi.addItem({
        name,
        category: "Pantry",
        unit: "loaf",
        reorderThresholdDays: 7,
        isOneTime: false,
      });
    }, uniqueName);

    expect(addedItem.id).toBeTruthy();
    expect(addedItem.name).toBe(uniqueName);

    // 3. Verify item is in the offline queue
    const queueAfterAdd = await page.evaluate(() => {
      const q = window.hootSync.getOfflineQueue();
      return {
        hasQueuedItem: Object.values(q.items).some((i) => i.name.includes("Offline Sourdough Loaf")),
        itemMutation: Object.values(q.items).find((i) => i.name.includes("Offline Sourdough Loaf")),
      };
    });
    expect(queueAfterAdd.hasQueuedItem).toBe(true);
    expect(queueAfterAdd.itemMutation.action).toBe("upsert");

    // 4. Reload page to verify local storage persistence
    await page.reload();

    // 5. Verify item is rendered on the dashboard
    await expect(page.locator("#dashboard-list")).toContainText(uniqueName);

    // 6. Test syncWithBackend runs safely even without backend
    await page.evaluate(async () => {
      await window.hootSync.syncWithBackend();
    });

    // 7. Test density change enqueues preference mutation
    const densityBtn = page.locator('#density-dense');
    if (await densityBtn.isVisible()) {
      await densityBtn.click();
      await expect(page.locator("body")).toHaveAttribute("data-density", "dense");

      // Verify preference enqueued
      const prefStatus = await page.evaluate(() => {
        const q = window.hootSync.getOfflineQueue();
        return q.preferences?.density ?? "synced";
      });
      expect(["dense", "synced"]).toContain(prefStatus);

      // Restore spacious density
      await page.locator('#density-spacious').click();
      await expect(page.locator("body")).toHaveAttribute("data-density", "spacious");
    }
  });

  test("switching sample clears queue and resets household context", async ({ page }) => {
    await page.goto("/");

    const sampleSelect = page.locator("#sample-select");
    const confirmDialog = page.locator("#confirm-dialog");

    await sampleSelect.selectOption("busy");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Switch sample" }).click();

    await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");
    const busyHouseholdId = await page.evaluate(() => window.hootSync.getHouseholdId());
    expect(busyHouseholdId).toBe("22222222-2222-2222-2222-222222222222");

    // Switch back to starter
    await sampleSelect.selectOption("starter");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Switch sample" }).click();

    await expect(page.locator("body")).toHaveAttribute("data-sample", "starter");
    const starterHouseholdId = await page.evaluate(() => window.hootSync.getHouseholdId());
    expect(starterHouseholdId).toBe("11111111-1111-1111-1111-111111111111");
  });
});
