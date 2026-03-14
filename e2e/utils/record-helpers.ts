import { expect, type Page } from "@playwright/test";

export async function waitForHomeReady(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "首页" })).toBeVisible();
  await expect(page.getByRole("button", { name: "记录一次" })).toBeEnabled();
}

export async function createRecord(page: Page, note: string) {
  await page.getByRole("button", { name: "记录一次" }).click();

  await expect(page.getByRole("heading", { name: "记录一次" })).toBeVisible();

  await page.getByLabel("形状").selectOption("normal");
  await page.getByLabel("感受").selectOption("smooth");
  await page.getByLabel("备注（选填）").fill(note);

  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(page.getByText("记录好了，今日顺顺 +1")).toBeVisible();
}
