// @vitest-environment node
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

async function createProductionApp() {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
  process.env.SESSION_SECRET = "test-session-secret-12345678901234567890";
  process.env.APP_ORIGIN = "https://rumahqu.web.id";
  process.env.COOKIE_SECURE = "false";

  vi.resetModules();
  const appModule = await import("../src/app.js");
  return appModule.createApp();
}

describe("SEO headers", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createProductionApp();
  });

  it("keeps the public homepage indexable", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBeUndefined();
    expect(response.text).toContain("RumahQu");
  });

  it("marks private SPA routes as noindex", async () => {
    const response = await request(app).get("/auth?tab=register");

    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response.text).toContain("RumahQu");
  });
});
