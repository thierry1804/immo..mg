import { test, expect } from "@playwright/test";

test("home loads and shows search", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Recherche conversationnelle" }),
  ).toBeVisible();
});

test("home loads listings in viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/\d+ biens?/)).toBeVisible({ timeout: 15_000 });
});
