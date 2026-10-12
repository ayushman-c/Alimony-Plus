import { expect, test } from "@playwright/test";

test("live mode uses the backend contract without mixing in demo data", async ({
  page,
}) => {
  const cases = [
    {
      id: 77,
      title: "Connected synthetic case",
      status: "ACTIVE",
      createdAt: "2026-10-01",
    },
  ];
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/backend/",
      "",
    );
    const results: Record<string, unknown> = {
      "auth/login": { user: { name: "Test user" } },
      cases: { cases },
      "proceedings/case/77": {
        proceedings: [
          { id: 88, caseId: 77, courtName: "Test court", status: "ONGOING" },
        ],
      },
      "orders/proceeding/88": {
        orders: [
          {
            id: 99,
            proceedingId: 88,
            orderType: "Test order",
            amount: "12000.00",
          },
        ],
      },
      "payments/order/99": {
        payments: [
          {
            id: 111,
            orderId: 99,
            amount: "6000.00",
            paymentDate: "2026-10-04",
            status: "RECEIVED",
          },
        ],
      },
    };
    await route.fulfill({ json: results[path] || { success: true } });
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good morning, Test." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Connected synthetic case/ }),
  ).toBeVisible();
  await expect(page.getByText("Meera’s maintenance case")).not.toBeVisible();
  await page.getByRole("link", { name: "Maintenance", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Monthly reconciliation is not available yet",
    }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "#99" })).toContainText(
    "₹6,000",
  );
});

test("synthetic file upload is session-only and downloadable", async ({
  page,
}) => {
  await page.goto("/documents");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page.getByLabel("Choose a document", { exact: true }).setInputFiles({
    name: "synthetic-proof.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nSynthetic test fixture"),
  });
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByText("synthetic-proof.pdf", { exact: true }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download synthetic-proof.pdf" })
    .click();
  expect((await downloading).suggestedFilename()).toBe("synthetic-proof.pdf");
  await page.reload();
  await expect(
    page.getByText("synthetic-proof.pdf", { exact: true }),
  ).not.toBeVisible();
});

test("custom negotiation terms are session-only", async ({ page }) => {
  await page.goto("/settlement");
  await page
    .getByRole("button", { name: "Add term", exact: true })
    .first()
    .click();
  await page.getByLabel("Term title").fill("Custody holiday schedule");
  await page
    .getByLabel("What is being discussed?")
    .fill("Alternate school holidays, to be discussed with the mediator.");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const row = page
    .locator(".term-item")
    .filter({ hasText: "Custody holiday schedule" });
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: "Agreed" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(
    page.locator(".term-item").filter({ hasText: "Custody holiday schedule" }),
  ).not.toBeVisible();
});

test("all mobile screens avoid page-level horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "cases",
    "orders",
    "payments",
    "documents",
    "calculator",
    "settlement",
    "data-review",
    "help",
    "settings",
    "login",
  ]) {
    await page.goto(`/${route}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
});

test("same-origin loopback logout is accepted by the real adapter", async ({
  request,
}) => {
  const response = await request.post("/api/backend/auth/logout", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {},
  });
  expect(response.status()).toBe(200);
  const forbidden = await request.post("/api/backend/auth/logout", {
    headers: { origin: "https://unrelated.example" },
    data: {},
  });
  expect(forbidden.status()).toBe(403);
});
