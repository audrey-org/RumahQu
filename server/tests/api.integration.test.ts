// @vitest-environment node
import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeIfDatabase = hasTestDatabase ? describe : describe.skip;

let app: Express;
let resetDatabaseForTests: typeof import("../src/db/migrate.js")["resetDatabaseForTests"];
let closePool: typeof import("../src/db/pool.js")["closePool"];

async function bootstrapCsrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get("/api/auth/me");
  return response.body.csrfToken as string;
}

async function registerUser(agent: ReturnType<typeof request.agent>, user: { email: string; password: string; fullName: string }) {
  const csrfToken = await bootstrapCsrf(agent);
  const response = await agent
    .post("/api/auth/register")
    .set("x-csrf-token", csrfToken)
    .send(user);

  expect(response.status).toBe(201);
  return response.body.user as { id: string; email: string; fullName: string };
}

describeIfDatabase("RumahQu API", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-session-secret-12345678901234567890";
    process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:8080";
    process.env.COOKIE_SECURE = "false";

    const dbModule = await import("../src/db/migrate.js");
    const appModule = await import("../src/app.js");
    const poolModule = await import("../src/db/pool.js");

    await dbModule.runMigrations();
    resetDatabaseForTests = dbModule.resetDatabaseForTests;
    closePool = poolModule.closePool;
    app = appModule.createApp();
  });

  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  afterAll(async () => {
    await closePool();
  });

  it("creates a personal group during registration", async () => {
    const agent = request.agent(app);
    await registerUser(agent, {
      email: "alice@example.com",
      password: "hunter22",
      fullName: "Alice Rumah",
    });

    const groupsResponse = await agent.get("/api/groups");
    expect(groupsResponse.status).toBe(200);
    expect(groupsResponse.body.groups).toHaveLength(1);
    expect(groupsResponse.body.groups[0]).toMatchObject({
      role: "owner",
      memberCount: 1,
    });
  });

  it("rejects duplicate email registration", async () => {
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);

    await registerUser(firstAgent, {
      email: "dup@example.com",
      password: "hunter22",
      fullName: "First User",
    });

    const csrfToken = await bootstrapCsrf(secondAgent);
    const response = await secondAgent
      .post("/api/auth/register")
      .set("x-csrf-token", csrfToken)
      .send({
        email: "dup@example.com",
        password: "hunter22",
        fullName: "Second User",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("supports invite acceptance and shared inventory access", async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);
    const stranger = request.agent(app);

    await registerUser(alice, {
      email: "alice@example.com",
      password: "hunter22",
      fullName: "Alice Rumah",
    });
    await registerUser(bob, {
      email: "bob@example.com",
      password: "hunter22",
      fullName: "Bob Rumah",
    });
    await registerUser(stranger, {
      email: "charlie@example.com",
      password: "hunter22",
      fullName: "Charlie Rumah",
    });

    const groupsResponse = await alice.get("/api/groups");
    const aliceGroupId = groupsResponse.body.groups[0].id as string;

    const aliceInviteCsrf = await bootstrapCsrf(alice);
    const inviteResponse = await alice
      .post(`/api/groups/${aliceGroupId}/invites`)
      .set("x-csrf-token", aliceInviteCsrf)
      .send({ email: "bob@example.com" });

    expect(inviteResponse.status).toBe(201);

    const bobGroupsBeforeAccept = await bob.get("/api/groups");
    expect(bobGroupsBeforeAccept.body.pendingInvites).toHaveLength(1);

    const bobAcceptCsrf = await bootstrapCsrf(bob);
    const acceptResponse = await bob
      .post(`/api/invites/${bobGroupsBeforeAccept.body.pendingInvites[0].id}/accept`)
      .set("x-csrf-token", bobAcceptCsrf)
      .send({});

    expect(acceptResponse.status).toBe(200);

    const aliceInventoryCsrf = await bootstrapCsrf(alice);
    const createItemResponse = await alice
      .post("/api/inventory")
      .set("x-csrf-token", aliceInventoryCsrf)
      .send({
        groupId: aliceGroupId,
        name: "Beras",
        category: "Makanan",
        quantity: 1,
        unit: "kg",
        expirationDate: "2026-12-31",
      });

    expect(createItemResponse.status).toBe(201);

    const bobInventoryResponse = await bob.get(`/api/inventory?groupId=${aliceGroupId}`);
    expect(bobInventoryResponse.status).toBe(200);
    expect(bobInventoryResponse.body.items[0].name).toBe("Beras");

    const strangerInventoryResponse = await stranger.get(`/api/inventory?groupId=${aliceGroupId}`);
    expect(strangerInventoryResponse.status).toBe(403);
  });

  it("prevents owners from leaving their own group", async () => {
    const agent = request.agent(app);
    const user = await registerUser(agent, {
      email: "owner@example.com",
      password: "hunter22",
      fullName: "Owner Rumah",
    });

    const groupsResponse = await agent.get("/api/groups");
    const csrfToken = await bootstrapCsrf(agent);
    const response = await agent
      .delete(`/api/groups/${groupsResponse.body.groups[0].id}/members/${user.id}`)
      .set("x-csrf-token", csrfToken);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("OWNER_CANNOT_LEAVE");
  });
});
