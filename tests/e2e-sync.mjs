import assert from "node:assert/strict";

const API_BASE = "http://localhost:5002";
const STARTER_HOUSEHOLD = "11111111-1111-1111-1111-111111111111";
const BUSY_HOUSEHOLD = "22222222-2222-2222-2222-222222222222";

async function testSyncEndToEnd() {
  console.log("=== Testing Backend Sync & Reset End-to-End ===");

  // 1. Reset starter demo
  console.log("1. Testing POST /api/households/reset-demo?sample=starter...");
  const resetStarterRes = await fetch(`${API_BASE}/api/households/reset-demo?sample=starter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Id": STARTER_HOUSEHOLD,
    },
  });
  assert.equal(resetStarterRes.status, 200, "Reset starter demo must return 200");
  const starterItems = await resetStarterRes.json();
  assert.equal(starterItems.length, 8, "Starter household should have 8 items (6 tracked + 2 one-time)");
  console.log(`   ✓ Starter household reset verified: ${starterItems.length} items`);

  // 2. Query delta sync without since (initial hydration)
  console.log("2. Testing GET /api/sync (initial hydration)...");
  const deltaRes = await fetch(`${API_BASE}/api/sync`, {
    headers: { "X-Household-Id": STARTER_HOUSEHOLD },
  });
  assert.equal(deltaRes.status, 200, "Delta sync must return 200");
  const deltaData = await deltaRes.json();
  assert.equal(deltaData.items.length, 8, "Delta items count should match");
  assert(deltaData.purchases.length > 0, "Starter household should have purchases");
  assert(deltaData.serverTimestamp, "Server timestamp must be present");
  const initialTimestamp = deltaData.serverTimestamp;
  console.log(`   ✓ Hydration verified: ${deltaData.items.length} items, ${deltaData.purchases.length} purchases`);

  // 3. Batch sync offline mutations
  console.log("3. Testing POST /api/sync/batch with offline mutations...");
  const testItemId = `item-test-${Date.now()}`;
  const testPurchaseId = `purchase-test-${Date.now()}`;
  const testPlanId = `plan-test-${Date.now()}`;
  const now = new Date().toISOString();

  const batchPayload = {
    items: [
      {
        id: testItemId,
        action: "upsert",
        name: "Sync Test Artisan Bread",
        category: "Pantry",
        unit: "loaf",
        reorderThresholdDays: 5,
        isOneTime: false,
        completed: false,
        updatedAt: now,
      },
    ],
    purchases: [
      {
        id: testPurchaseId,
        itemId: testItemId,
        action: "upsert",
        date: "2026-11-16",
        quantity: 2,
        price: 6.5,
        earlyRestock: false,
        updatedAt: now,
      },
    ],
    plans: [
      {
        id: testPlanId,
        action: "upsert",
        targetDate: "2026-11-20",
        selectedItemIds: [testItemId],
        completed: false,
        updatedAt: now,
      },
    ],
    preferences: {
      density: "dense",
      dashboardView: "shelves",
      aisleOrder: ["Pantry", "Produce"],
      outOfStockItemIds: [testItemId],
      updatedAt: now,
    },
  };

  const batchRes = await fetch(`${API_BASE}/api/sync/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Id": STARTER_HOUSEHOLD,
    },
    body: JSON.stringify(batchPayload),
  });
  assert.equal(batchRes.status, 200, "Batch sync must return 200");
  const batchResult = await batchRes.json();
  assert.equal(batchResult.success, true, "Batch sync should succeed");
  assert.equal(batchResult.conflictCount, 0, "No conflicts expected");
  assert(batchResult.appliedCount >= 4, "Should have applied items, purchases, plans, prefs");
  console.log(`   ✓ Batch sync applied ${batchResult.appliedCount} mutations atomically`);

  // 4. Query delta since initialTimestamp
  console.log("4. Testing GET /api/sync?since=...");
  const deltaSinceRes = await fetch(
    `${API_BASE}/api/sync?since=${encodeURIComponent(initialTimestamp)}`,
    {
      headers: { "X-Household-Id": STARTER_HOUSEHOLD },
    }
  );
  assert.equal(deltaSinceRes.status, 200, "Delta since must return 200");
  const deltaSinceData = await deltaSinceRes.json();
  assert.equal(deltaSinceData.items.length, 1, "Only 1 newly added item should be returned in delta");
  assert.equal(deltaSinceData.items[0].id, testItemId, "Item id should match");
  assert.equal(deltaSinceData.purchases.length, 1, "Only 1 new purchase should be returned in delta");
  assert.equal(deltaSinceData.purchases[0].id, testPurchaseId, "Purchase id should match");
  assert.equal(deltaSinceData.plans.length, 1, "Only 1 new plan should be returned in delta");
  assert.equal(deltaSinceData.plans[0].id, testPlanId, "Plan id should match");
  assert.equal(deltaSinceData.preferences.density, "dense", "Preference density should match");
  console.log("   ✓ Delta sync verified: exactly the mutated entities returned");

  // 5. Test soft-delete tombstone
  console.log("5. Testing soft-delete tombstone via batch sync...");
  const deleteBatchRes = await fetch(`${API_BASE}/api/sync/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Id": STARTER_HOUSEHOLD,
    },
    body: JSON.stringify({
      items: [{ id: testItemId, action: "delete", updatedAt: new Date().toISOString() }],
    }),
  });
  assert.equal(deleteBatchRes.status, 200, "Delete batch sync must return 200");

  const tombstoneDeltaRes = await fetch(
    `${API_BASE}/api/sync?since=${encodeURIComponent(deltaSinceData.serverTimestamp)}`,
    {
      headers: { "X-Household-Id": STARTER_HOUSEHOLD },
    }
  );
  const tombstoneDelta = await tombstoneDeltaRes.json();
  assert.equal(tombstoneDelta.items.length, 1, "Tombstone item returned");
  assert.equal(tombstoneDelta.items[0].id, testItemId);
  assert.equal(tombstoneDelta.items[0].isDeleted, true, "Item should be marked deleted");
  console.log("   ✓ Tombstone sync verified: soft-deleted item marked isDeleted: true");

  // 6. Test busy household reset
  console.log("6. Testing POST /api/households/reset-demo?sample=busy...");
  const resetBusyRes = await fetch(`${API_BASE}/api/households/reset-demo?sample=busy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Id": BUSY_HOUSEHOLD,
    },
  });
  assert.equal(resetBusyRes.status, 200, "Reset busy demo must return 200");
  const busyItems = await resetBusyRes.json();
  assert.equal(busyItems.length, 44, "Busy household should have 44 items (38 tracked + 6 one-time)");
  console.log(`   ✓ Busy household reset verified: ${busyItems.length} items`);

  // Clean up: Reset starter back to baseline
  await fetch(`${API_BASE}/api/households/reset-demo?sample=starter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Id": STARTER_HOUSEHOLD,
    },
  });

  console.log("=== All Backend Sync & Reset Integration Tests Passed! ===");
}

testSyncEndToEnd().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
