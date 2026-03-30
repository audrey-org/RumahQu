// @vitest-environment node
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeIfDatabase = hasTestDatabase ? describe : describe.skip;

let app: Express;
let resetDatabaseForTests: typeof import("../src/db/migrate.js")["resetDatabaseForTests"];
let closePool: typeof import("../src/db/pool.js")["closePool"];

function isoDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function bootstrapCsrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get("/api/auth/me");
  return response.body.csrfToken as string;
}

async function registerPendingUser(
  agent: ReturnType<typeof request.agent>,
  user: { email: string; password: string; fullName: string },
) {
  const csrfToken = await bootstrapCsrf(agent);
  const response = await agent.post("/api/auth/register").set("x-csrf-token", csrfToken).send(user);

  expect(response.status).toBe(202);
  expect(response.body.verificationRequired).toBe(true);
  expect(response.body.verificationUrl).toBeTruthy();
  return response.body as { email: string; verificationUrl: string };
}

async function verifyUser(agent: ReturnType<typeof request.agent>, verificationUrl: string) {
  const parsedUrl = new URL(verificationUrl);
  const response = await agent.get(`${parsedUrl.pathname}${parsedUrl.search}`);
  expect(response.status).toBe(302);
  expect(response.headers.location).toContain("/?verified=1");
  return response;
}

async function registerAndVerifyUser(
  agent: ReturnType<typeof request.agent>,
  user: { email: string; password: string; fullName: string },
) {
  const registration = await registerPendingUser(agent, user);
  await verifyUser(agent, registration.verificationUrl);
  const sessionResponse = await agent.get("/api/auth/me");
  expect(sessionResponse.status).toBe(200);
  expect(sessionResponse.body.user).toMatchObject({
    email: user.email,
    fullName: user.fullName,
  });
  return sessionResponse.body.user as { id: string; email: string; fullName: string };
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

  it("creates a personal group after email verification", async () => {
    const agent = request.agent(app);
    const registration = await registerPendingUser(agent, {
      email: "alice@example.com",
      password: "hunter22",
      fullName: "Alice Rumah",
    });

    const groupsBeforeVerification = await agent.get("/api/groups");
    expect(groupsBeforeVerification.status).toBe(401);

    await verifyUser(agent, registration.verificationUrl);

    const groupsResponse = await agent.get("/api/groups");
    expect(groupsResponse.status).toBe(200);
    expect(groupsResponse.body.groups).toHaveLength(1);
    expect(groupsResponse.body.groups[0]).toMatchObject({
      role: "owner",
      memberCount: 1,
    });
  });

  it("serves email preview pages in non-production environments", async () => {
    const response = await request(app).get("/api/dev/email-preview");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Preview template email RumahQu");

    const verificationPreview = await request(app).get("/api/dev/email-preview?template=verification");
    expect(verificationPreview.status).toBe(200);
    expect(verificationPreview.headers["x-email-preview-subject"]).toBe("Verifikasi email akun RumahQu");
    expect(verificationPreview.text).toContain("Selamat datang di RumahQu");

    const resetPreview = await request(app).get("/api/dev/email-preview?template=reset-password");
    expect(resetPreview.status).toBe(200);
    expect(resetPreview.headers["x-email-preview-subject"]).toBe("Reset password akun RumahQu");
    expect(resetPreview.text).toContain("Buat password baru");
  });

  it("rejects login before the email address is verified", async () => {
    const agent = request.agent(app);
    await registerPendingUser(agent, {
      email: "pending@example.com",
      password: "hunter22",
      fullName: "Pending User",
    });

    const csrfToken = await bootstrapCsrf(agent);
    const response = await agent.post("/api/auth/login").set("x-csrf-token", csrfToken).send({
      email: "pending@example.com",
      password: "hunter22",
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects duplicate email registration after the email is verified", async () => {
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);

    await registerAndVerifyUser(firstAgent, {
      email: "dup@example.com",
      password: "hunter22",
      fullName: "First User",
    });

    const csrfToken = await bootstrapCsrf(secondAgent);
    const response = await secondAgent.post("/api/auth/register").set("x-csrf-token", csrfToken).send({
      email: "dup@example.com",
      password: "hunter22",
      fullName: "Second User",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("returns a generic forgot password response for unknown emails", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const response = await agent.post("/api/auth/forgot-password").set("x-csrf-token", csrfToken).send({
      email: "unknown@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("link reset password");
    expect(response.body.resetUrl).toBeUndefined();
  });

  it("resets the password via email token and invalidates existing sessions", async () => {
    const agent = request.agent(app);
    await registerAndVerifyUser(agent, {
      email: "reset@example.com",
      password: "hunter22",
      fullName: "Reset User",
    });

    const forgotCsrf = await bootstrapCsrf(agent);
    const forgotResponse = await agent.post("/api/auth/forgot-password").set("x-csrf-token", forgotCsrf).send({
      email: "reset@example.com",
    });

    expect(forgotResponse.status).toBe(200);
    expect(forgotResponse.body.resetUrl).toBeTruthy();

    const resetToken = new URL(forgotResponse.body.resetUrl).searchParams.get("token");
    expect(resetToken).toBeTruthy();

    const resetCsrf = await bootstrapCsrf(agent);
    const resetResponse = await agent.post("/api/auth/reset-password").set("x-csrf-token", resetCsrf).send({
      token: resetToken,
      password: "newpass22",
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toContain("Password berhasil");

    const sessionResponse = await agent.get("/api/auth/me");
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.user).toBeNull();

    const oldLoginCsrf = await bootstrapCsrf(agent);
    const oldLoginResponse = await agent.post("/api/auth/login").set("x-csrf-token", oldLoginCsrf).send({
      email: "reset@example.com",
      password: "hunter22",
    });

    expect(oldLoginResponse.status).toBe(401);

    const newLoginCsrf = await bootstrapCsrf(agent);
    const newLoginResponse = await agent.post("/api/auth/login").set("x-csrf-token", newLoginCsrf).send({
      email: "reset@example.com",
      password: "newpass22",
    });

    expect(newLoginResponse.status).toBe(200);
    expect(newLoginResponse.body.user).toMatchObject({
      email: "reset@example.com",
      fullName: "Reset User",
    });
  });

  it("supports invite acceptance and shared inventory access", async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);
    const stranger = request.agent(app);

    await registerAndVerifyUser(alice, {
      email: "alice@example.com",
      password: "hunter22",
      fullName: "Alice Rumah",
    });
    await registerAndVerifyUser(bob, {
      email: "bob@example.com",
      password: "hunter22",
      fullName: "Bob Rumah",
    });
    await registerAndVerifyUser(stranger, {
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
    const createItemResponse = await alice.post("/api/inventory").set("x-csrf-token", aliceInventoryCsrf).send({
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

  it("supports a shared shopping list for restocking needs", async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);

    await registerAndVerifyUser(alice, {
      email: "alice-restock@example.com",
      password: "hunter22",
      fullName: "Alice Restock",
    });
    await registerAndVerifyUser(bob, {
      email: "bob-restock@example.com",
      password: "hunter22",
      fullName: "Bob Restock",
    });

    const groupsResponse = await alice.get("/api/groups");
    const groupId = groupsResponse.body.groups[0].id as string;

    const inviteCsrf = await bootstrapCsrf(alice);
    const inviteResponse = await alice
      .post(`/api/groups/${groupId}/invites`)
      .set("x-csrf-token", inviteCsrf)
      .send({ email: "bob-restock@example.com" });

    expect(inviteResponse.status).toBe(201);

    const bobGroups = await bob.get("/api/groups");
    const bobAcceptCsrf = await bootstrapCsrf(bob);
    const acceptResponse = await bob
      .post(`/api/invites/${bobGroups.body.pendingInvites[0].id}/accept`)
      .set("x-csrf-token", bobAcceptCsrf)
      .send({});

    expect(acceptResponse.status).toBe(200);

    const aliceCsrf = await bootstrapCsrf(alice);
    const createResponse = await alice.post("/api/shopping-list").set("x-csrf-token", aliceCsrf).send({
      groupId,
      name: "Minyak goreng",
      category: "Bumbu Dapur",
      quantity: 2,
      unit: "liter",
      notes: "Beli yang kemasan refill",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: "Minyak goreng",
      isPurchased: false,
      createdByName: "Alice Restock",
    });

    const shoppingListResponse = await bob.get(`/api/shopping-list?groupId=${groupId}`);
    expect(shoppingListResponse.status).toBe(200);
    expect(shoppingListResponse.body.items).toHaveLength(1);
    expect(shoppingListResponse.body.items[0].name).toBe("Minyak goreng");

    const bobCsrf = await bootstrapCsrf(bob);
    const updateResponse = await bob
      .patch(`/api/shopping-list/${shoppingListResponse.body.items[0].id}`)
      .set("x-csrf-token", bobCsrf)
      .send({ isPurchased: true });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      isPurchased: true,
      purchasedByName: "Bob Restock",
    });

    const deleteResponse = await alice
      .delete(`/api/shopping-list/${shoppingListResponse.body.items[0].id}`)
      .set("x-csrf-token", aliceCsrf);

    expect(deleteResponse.status).toBe(204);

    const emptyShoppingListResponse = await alice.get(`/api/shopping-list?groupId=${groupId}`);
    expect(emptyShoppingListResponse.status).toBe(200);
    expect(emptyShoppingListResponse.body.items).toHaveLength(0);
  });

  it("builds deterministic meal recommendations and can add missing ingredients to shopping list", async () => {
    const alice = request.agent(app);
    const stranger = request.agent(app);

    await registerAndVerifyUser(alice, {
      email: "alice-menu@example.com",
      password: "hunter22",
      fullName: "Alice Menu",
    });
    await registerAndVerifyUser(stranger, {
      email: "stranger-menu@example.com",
      password: "hunter22",
      fullName: "Stranger Menu",
    });

    const groupsResponse = await alice.get("/api/groups");
    const groupId = groupsResponse.body.groups[0].id as string;
    const csrfToken = await bootstrapCsrf(alice);

    const createRiceResponse = await alice.post("/api/inventory").set("x-csrf-token", csrfToken).send({
      groupId,
      name: "rice",
      category: "Makanan",
      quantity: 1,
      unit: "kg",
      expirationDate: isoDateFromToday(120),
    });
    expect(createRiceResponse.status).toBe(201);

    const createEggResponse = await alice.post("/api/inventory").set("x-csrf-token", csrfToken).send({
      groupId,
      name: "telor",
      category: "Makanan",
      quantity: 6,
      unit: "pcs",
      expirationDate: isoDateFromToday(2),
    });
    expect(createEggResponse.status).toBe(201);

    const recommendationsResponse = await alice.get(`/api/meal-recommendations?groupId=${groupId}`);
    expect(recommendationsResponse.status).toBe(200);
    expect(recommendationsResponse.body.totalCatalogRecipes).toBeGreaterThanOrEqual(200);

    const targetRecipe = recommendationsResponse.body.recommendations.find(
      (recommendation: { recipeId: string }) => recommendation.recipeId === "indo-nasi-goreng-telur",
    );

    expect(targetRecipe).toBeTruthy();
    expect(targetRecipe.bucket).toBe("kurang-sedikit");
    expect(targetRecipe.missingIngredients[0].ingredientId).toBe("kecap_manis");

    const strangerRecommendationsResponse = await stranger.get(`/api/meal-recommendations?groupId=${groupId}`);
    expect(strangerRecommendationsResponse.status).toBe(403);

    const addMissingResponse = await alice
      .post("/api/meal-recommendations/indo-nasi-goreng-telur/add-missing-to-shopping-list")
      .set("x-csrf-token", csrfToken)
      .send({ groupId });

    expect(addMissingResponse.status).toBe(200);
    expect(addMissingResponse.body.addedItems).toHaveLength(1);
    expect(addMissingResponse.body.addedItems[0]).toMatchObject({
      ingredientId: "kecap_manis",
      name: "Kecap Manis",
      category: "Bumbu Dapur",
    });

    const duplicateAddResponse = await alice
      .post("/api/meal-recommendations/indo-nasi-goreng-telur/add-missing-to-shopping-list")
      .set("x-csrf-token", csrfToken)
      .send({ groupId });

    expect(duplicateAddResponse.status).toBe(200);
    expect(duplicateAddResponse.body.addedItems).toHaveLength(0);
    expect(duplicateAddResponse.body.skippedItems).toEqual([
      {
        ingredientId: "kecap_manis",
        name: "Kecap Manis",
        reason: "already-in-shopping-list",
      },
    ]);
  });

  it("prevents owners from leaving their own group", async () => {
    const agent = request.agent(app);
    const user = await registerAndVerifyUser(agent, {
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
