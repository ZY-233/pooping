import { expect, test, type Page, type Route } from "@playwright/test";

function buildVerifySuccessBody(email: string) {
  const now = new Date().toISOString();
  return {
    access_token: "mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token",
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email,
      email_confirmed_at: now,
      phone: "",
      confirmation_sent_at: now,
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
      is_anonymous: false,
    },
  };
}

async function mockOtpApis(
  page: Page,
  params: {
    verifySuccess: boolean;
    email: string;
  },
) {
  await page.route("**/auth/v1/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (method === "POST" && path.endsWith("/otp")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }

    if (method === "POST" && path.endsWith("/verify")) {
      if (params.verifySuccess) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildVerifySuccessBody(params.email)),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: 400,
            error_code: "otp_invalid",
            msg: "Token has expired or is invalid",
            error: "Token has expired or is invalid",
          }),
        });
      }
      return;
    }

    await route.continue();
  });
}

test("发送验证码后进入验证码输入步骤", async ({ page }) => {
  const email = "otp-flow@example.com";
  await mockOtpApis(page, { verifySuccess: true, email });

  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByRole("button", { name: "发送验证码" }).click();

  await expect(page.getByText(`验证码已发送至：${email}`)).toBeVisible();
  await expect(page.getByText("输入 6 位验证码")).toBeVisible();
  await expect(page.getByText("验证码已发送，请去邮箱查看")).toBeVisible();
  await expect(page.getByRole("button", { name: /后重发|重新发送/ })).toBeVisible();
});

test("验证码错误时显示失败提示", async ({ page }) => {
  const email = "otp-error@example.com";
  await mockOtpApis(page, { verifySuccess: false, email });

  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByRole("button", { name: "发送验证码" }).click();

  await page.getByPlaceholder("123456").fill("000000");
  await page.getByRole("button", { name: "验证并登录" }).click();

  await expect(page.getByText("验证失败，请重试")).toBeVisible();
});

test("验证码正确后跳转到我的页面", async ({ page }) => {
  const email = "otp-success@example.com";
  await mockOtpApis(page, { verifySuccess: true, email });

  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByRole("button", { name: "发送验证码" }).click();

  await page.getByPlaceholder("123456").fill("123456");
  await page.getByRole("button", { name: "验证并登录" }).click();

  await expect(page).toHaveURL(/\/me$/);
});

