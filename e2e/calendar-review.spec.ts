import { expect, test } from "@playwright/test";

import { createRecord, waitForHomeReady } from "./utils/record-helpers";

test("日历回看：按月查看并跳转详情", async ({ page }) => {
  const stamp = Date.now();
  const note = `e2e-calendar-${stamp}`;

  await waitForHomeReady(page);
  await createRecord(page, note);

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "日历" })).toBeVisible();
  await expect(page.getByText(/本月一共记录\s*\d+\s*次/)).toBeVisible();

  const monthTitle = page.locator("h3").first();
  const before = (await monthTitle.textContent()) ?? "";

  await page.getByRole("button", { name: "下一月" }).click();
  await expect(monthTitle).not.toHaveText(before);
  await page.getByRole("button", { name: "上一月" }).click();

  await expect(page.locator('a[href^="/records/"]').first()).toBeVisible();
  await page.locator('a[href^="/records/"]').first().click();

  await expect(page).toHaveURL(/\/records\//);
  await expect(page.getByRole("heading", { name: "查看 / 编辑" })).toBeVisible();
});
