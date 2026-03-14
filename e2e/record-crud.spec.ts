import { expect, test } from "@playwright/test";

import { createRecord, waitForHomeReady } from "./utils/record-helpers";

test("单人记录闭环：创建-查看-编辑-删除", async ({ page }) => {
  const stamp = Date.now();
  const noteCreated = `e2e-created-${stamp}`;
  const noteEdited = `e2e-edited-${stamp}`;

  await waitForHomeReady(page);
  await createRecord(page, noteCreated);

  await page.locator('a[href^="/records/"]').first().click();
  await expect(page).toHaveURL(/\/records\//);
  await expect(page.getByText(noteCreated)).toBeVisible();

  await page.getByRole("button", { name: "编辑记录" }).click();
  await page.getByLabel("备注（选填）").fill(noteEdited);
  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(page.getByText("记录已更新")).toBeVisible();
  await expect(page.getByText(noteEdited)).toBeVisible();

  const deletedRecordUrl = page.url();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除记录" }).click();

  await expect(page).toHaveURL("/");

  await page.goto(deletedRecordUrl);
  await expect(page.getByText("这条记录不存在，或已被删除。")).toBeVisible();
});
