// @vitest-environment node
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

async function createTestApp() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
  process.env.SESSION_SECRET = "test-session-secret-12345678901234567890";
  process.env.APP_ORIGIN = "https://rumahqu.example.com";
  process.env.COOKIE_SECURE = "false";

  vi.resetModules();
  const appModule = await import("../src/app.js");
  return appModule.createApp();
}

describe("CORS policy", () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
  });

  it("allows the configured frontend origin", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Origin", "https://rumahqu.example.com");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://rumahqu.example.com");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows Origin null when the request is forwarded for the configured app host", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Origin", "null")
      .set("Host", "rumahqu.example.com")
      .set("X-Forwarded-Proto", "https");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("null");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects Origin null for untrusted hosts", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Origin", "null")
      .set("Host", "evil.example.com")
      .set("X-Forwarded-Proto", "https");

    expect(response.status).toBe(403);
  });
});
