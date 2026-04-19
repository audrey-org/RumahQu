import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { PoolClient } from "pg";
import { z } from "zod";
import { verify as verifyPassword, hash as hashPassword, Algorithm } from "@node-rs/argon2";
import type {
  AddMissingIngredientsResponse,
  AdminStatsResponse,
  AdminUserSummary,
  AdminUsersResponse,
  AuthResponse,
  GroupMember,
  InventoryAdjustment,
  GroupSummary,
  InventoryItem,
  InventoryAdjustmentsResponse,
  MealRecommendationsResponse,
  PasswordResetEmailResponse,
  PasswordResetResponse,
  RestockSuggestionResponse,
  ShoppingListItem,
  PendingInvite,
  RegisterResponse,
  SessionResponse,
  SessionUser,
  VerificationEmailResponse,
} from "../../shared/contracts.js";
import { env } from "./config.js";
import { getPool, query, withTransaction } from "./db/pool.js";
import { AppError } from "./errors.js";
import {
  renderEmailPreview,
  renderEmailPreviewIndex,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email.js";
import { logError, requestLogger } from "./logger.js";
import {
  getRecipeCatalogStats,
  getRecipeDefinitionById,
  normalizeCatalogText,
} from "./meal-recommendations/catalog.js";
import {
  buildMealRecommendations,
  getMissingRequiredIngredientsForRecipe,
} from "./meal-recommendations/engine.js";
import {
  clearAuthCookies,
  createRandomToken,
  createSession,
  deleteSession,
  getCookieNames,
  getSessionFromToken,
  hashToken,
  parseCookies,
  setCsrfCookie,
  setSessionCookies,
  type SessionContext,
} from "./security.js";

type AuthenticatedRequest = Request & {
  auth: {
    session: SessionContext | null;
    user: SessionUser | null;
    csrfToken: string;
    rawSessionToken: string | null;
  };
};

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: Date;
  role: SessionUser["role"];
  password_hash: string;
  email_verified_at: Date | null;
};

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: SessionUser["role"];
  created_at: Date;
  email_verified_at: Date | null;
};

type AdminUserCountsRow = {
  total_users: string | number;
  verified_users: string | number;
};

type DailySignupRow = {
  signup_date: string | Date;
  signup_count: string | number;
};

type GroupRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: Date;
  role: "owner" | "member";
  member_count: string | number;
};

type InviteRow = {
  id: string;
  group_id: string;
  group_name: string;
  invited_email: string;
  invited_by_user_id: string;
  invited_by_full_name: string;
  created_at: Date;
};

type GroupMemberRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: "owner" | "member";
  joined_at: Date;
};

type InventoryRow = {
  id: string;
  group_id: string;
  added_by: string | null;
  added_by_name: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number | null;
  restock_target_quantity: number | null;
  expiration_date: string | Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type InventoryAdjustmentRow = {
  id: string;
  item_id: string;
  group_id: string;
  adjusted_by: string | null;
  adjusted_by_name: string | null;
  type: InventoryAdjustment["type"];
  delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: Date;
};

type ShoppingListRow = {
  id: string;
  group_id: string;
  created_by: string | null;
  created_by_name: string | null;
  purchased_by: string | null;
  purchased_by_name: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  notes: string | null;
  is_purchased: boolean;
  purchased_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type EmailVerificationTokenRow = {
  user_id: string;
  expires_at: Date;
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: Date;
  password_hash: string;
  email_verified_at: Date | null;
};

type PasswordResetTokenRow = {
  user_id: string;
  expires_at: Date;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistCandidates = [
  path.resolve(__dirname, "../../../dist"),
  path.resolve(__dirname, "../../dist"),
];
const frontendDistDirectory =
  frontendDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ??
  frontendDistCandidates[0];
const frontendIndexFile = path.join(frontendDistDirectory, "index.html");
const noIndexSpaPaths = new Set(["/auth", "/app", "/inventory", "/meal-recommendations", "/groups", "/profile", "/admin"]);

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(255),
  fullName: z.string().trim().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(255),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(6).max(255),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  avatarUrl: z.string().trim().url().nullable().optional(),
});

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const inviteSchema = z.object({
  email: z.string().trim().email(),
});

const createInventoryItemSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  quantity: z.number().int().nonnegative(),
  unit: z.string().trim().min(1).max(40),
  lowStockThreshold: z.number().int().nonnegative().nullable().optional(),
  restockTargetQuantity: z.number().int().nonnegative().nullable().optional(),
  expirationDate: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (
    value.lowStockThreshold !== undefined &&
    value.lowStockThreshold !== null &&
    value.restockTargetQuantity !== undefined &&
    value.restockTargetQuantity !== null &&
    value.restockTargetQuantity <= value.lowStockThreshold
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["restockTargetQuantity"],
      message: "Target restock harus lebih besar dari batas stok rendah",
    });
  }
});

const updateInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().int().nonnegative().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    lowStockThreshold: z.number().int().nonnegative().nullable().optional(),
    restockTargetQuantity: z.number().int().nonnegative().nullable().optional(),
    expirationDate: z.string().trim().min(1).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated",
  });

const adjustInventoryStockSchema = z
  .object({
    type: z.enum(["add", "use", "set"]),
    quantity: z.number().int().nonnegative(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if ((value.type === "add" || value.type === "use") && value.quantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Jumlah harus lebih dari 0",
      });
    }
  });

const createShoppingListItemSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  quantity: z.number().int().positive(),
  unit: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(500).optional(),
});

const updateShoppingListItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().int().positive().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    isPurchased: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated",
  });

const addMissingIngredientsSchema = z.object({
  groupId: z.string().uuid(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildPersonalGroupName(fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] || "Keluarga";
  return `Rumah ${firstName}`;
}

function buildRequestOrigin(req: Request) {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function buildVerificationUrl(req: Request, token: string) {
  const url = new URL("/api/auth/verify-email", buildRequestOrigin(req));
  url.searchParams.set("token", token);
  return url.toString();
}

function buildVerificationRedirectUrl(status: "invalid" | "expired") {
  const url = new URL("/auth", env.primaryAppOrigin);
  url.searchParams.set("verification", status);
  return url.toString();
}

function buildPasswordResetUrl(token: string) {
  const url = new URL("/auth", env.primaryAppOrigin);
  url.searchParams.set("mode", "reset-password");
  url.searchParams.set("token", token);
  return url.toString();
}

function shouldNoIndexSpaPath(requestPath: string) {
  return noIndexSpaPaths.has(requestPath);
}

function buildRegisterResponse(email: string, verificationUrl?: string): RegisterResponse {
  return {
    email,
    verificationRequired: true,
    message: "Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi.",
    verificationUrl: env.NODE_ENV === "production" ? undefined : verificationUrl,
  };
}

function buildVerificationEmailResponse(email?: string, verificationUrl?: string): VerificationEmailResponse {
  return {
    message: "Jika email terdaftar dan belum diverifikasi, link verifikasi baru sudah dikirim.",
    email,
    verificationUrl: env.NODE_ENV === "production" ? undefined : verificationUrl,
  };
}

function buildPasswordResetEmailResponse(email?: string, resetUrl?: string): PasswordResetEmailResponse {
  return {
    message: "Jika email terdaftar, link reset password sudah dikirim.",
    email,
    resetUrl: env.NODE_ENV === "production" ? undefined : resetUrl,
  };
}

function buildPasswordResetResponse(): PasswordResetResponse {
  return {
    message: "Password berhasil diperbarui. Silakan masuk dengan password baru Anda.",
  };
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
    role: row.role,
  };
}

function toAdminUserSummary(row: AdminUserRow): AdminUserSummary {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    emailVerifiedAt: row.email_verified_at?.toISOString() ?? null,
  };
}

function toGroupSummary(row: GroupRow): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    memberCount: Number(row.member_count),
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

function toPendingInvite(row: InviteRow): PendingInvite {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    invitedEmail: row.invited_email,
    invitedByUserId: row.invited_by_user_id,
    invitedByFullName: row.invited_by_full_name,
    createdAt: row.created_at.toISOString(),
  };
}

function toGroupMember(row: GroupMemberRow): GroupMember {
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    joinedAt: row.joined_at.toISOString(),
  };
}

function normalizeExpirationDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "INVALID_EXPIRATION_DATE", "Tanggal kedaluwarsa tidak valid");
  }

  return parsed.toISOString().slice(0, 10);
}

function toInventoryItem(row: InventoryRow): InventoryItem {
  const expirationDate =
    row.expiration_date instanceof Date
      ? row.expiration_date.toISOString().slice(0, 10)
      : row.expiration_date;

  return {
    id: row.id,
    groupId: row.group_id,
    addedBy: row.added_by,
    addedByName: row.added_by_name,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    lowStockThreshold: row.low_stock_threshold,
    restockTargetQuantity: row.restock_target_quantity,
    expirationDate,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toInventoryAdjustment(row: InventoryAdjustmentRow): InventoryAdjustment {
  return {
    id: row.id,
    itemId: row.item_id,
    groupId: row.group_id,
    adjustedBy: row.adjusted_by,
    adjustedByName: row.adjusted_by_name,
    type: row.type,
    delta: row.delta,
    quantityBefore: row.quantity_before,
    quantityAfter: row.quantity_after,
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  };
}

function toShoppingListItem(row: ShoppingListRow): ShoppingListItem {
  return {
    id: row.id,
    groupId: row.group_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    purchasedBy: row.purchased_by,
    purchasedByName: row.purchased_by_name,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes,
    isPurchased: row.is_purchased,
    purchasedAt: row.purchased_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function handleZodError(error: z.ZodError) {
  return new AppError(400, "VALIDATION_ERROR", "Permintaan tidak valid", {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw handleZodError(parsed.error);
  }

  return parsed.data;
}

function assertValidRestockSettings(lowStockThreshold: number | null, restockTargetQuantity: number | null) {
  if (
    lowStockThreshold !== null &&
    restockTargetQuantity !== null &&
    restockTargetQuantity <= lowStockThreshold
  ) {
    throw new AppError(400, "VALIDATION_ERROR", "Target restock harus lebih besar dari batas stok rendah");
  }
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).auth;
}

function getRouteParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", `${name} tidak valid`);
  }

  return value;
}

async function getGroupsResponse(userId: string) {
  const [groupsResult, invitesResult] = await Promise.all([
    query<GroupRow>(
      `
        SELECT
          g.id,
          g.name,
          g.created_by,
          g.created_at,
          gm.role,
          COUNT(gm_all.id)::int AS member_count
        FROM groups g
        JOIN group_members gm
          ON gm.group_id = g.id
         AND gm.user_id = $1
        JOIN group_members gm_all
          ON gm_all.group_id = g.id
        GROUP BY g.id, gm.role
        ORDER BY g.created_at ASC
      `,
      [userId],
    ),
    query<InviteRow>(
      `
        SELECT
          gi.id,
          gi.group_id,
          g.name AS group_name,
          gi.invited_email,
          gi.invited_by AS invited_by_user_id,
          inviter.full_name AS invited_by_full_name,
          gi.created_at
        FROM group_invites gi
        JOIN groups g ON g.id = gi.group_id
        JOIN users inviter ON inviter.id = gi.invited_by
        WHERE gi.invited_user_id = $1
        ORDER BY gi.created_at DESC
      `,
      [userId],
    ),
  ]);

  return {
    groups: groupsResult.rows.map(toGroupSummary),
    pendingInvites: invitesResult.rows.map(toPendingInvite),
  };
}

async function getGroupRole(groupId: string, userId: string) {
  const result = await query<{ role: "owner" | "member" }>(
    "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, userId],
  );

  return result.rows[0]?.role ?? null;
}

async function assertGroupMember(groupId: string, userId: string) {
  const role = await getGroupRole(groupId, userId);

  if (!role) {
    throw new AppError(403, "FORBIDDEN", "Anda tidak memiliki akses ke grup ini");
  }

  return role;
}

async function assertGroupOwner(groupId: string, userId: string) {
  const role = await assertGroupMember(groupId, userId);

  if (role !== "owner") {
    throw new AppError(403, "FORBIDDEN", "Hanya owner grup yang dapat melakukan aksi ini");
  }

  return role;
}

async function fetchInventoryItem(itemId: string) {
  const result = await query<InventoryRow>(
    `
      SELECT
        i.id,
        i.group_id,
        i.added_by,
        creator.full_name AS added_by_name,
        i.name,
        i.category,
        i.quantity,
        i.unit,
        i.low_stock_threshold,
        i.restock_target_quantity,
        i.expiration_date,
        i.notes,
        i.created_at,
        i.updated_at
      FROM inventory_items i
      LEFT JOIN users creator ON creator.id = i.added_by
      WHERE i.id = $1
    `,
    [itemId],
  );

  return result.rows[0] ?? null;
}

async function fetchInventoryByGroup(groupId: string) {
  const result = await query<InventoryRow>(
    `
      SELECT
        i.id,
        i.group_id,
        i.added_by,
        creator.full_name AS added_by_name,
        i.name,
        i.category,
        i.quantity,
        i.unit,
        i.low_stock_threshold,
        i.restock_target_quantity,
        i.expiration_date,
        i.notes,
        i.created_at,
        i.updated_at
      FROM inventory_items i
      LEFT JOIN users creator ON creator.id = i.added_by
      WHERE i.group_id = $1
      ORDER BY i.expiration_date ASC, i.created_at DESC
    `,
    [groupId],
  );

  return result.rows;
}

async function fetchShoppingListItem(itemId: string) {
  const result = await query<ShoppingListRow>(
    `
      SELECT
        s.id,
        s.group_id,
        s.created_by,
        creator.full_name AS created_by_name,
        s.purchased_by,
        purchaser.full_name AS purchased_by_name,
        s.name,
        s.category,
        s.quantity,
        s.unit,
        s.notes,
        s.is_purchased,
        s.purchased_at,
        s.created_at,
        s.updated_at
      FROM shopping_list_items s
      LEFT JOIN users creator ON creator.id = s.created_by
      LEFT JOIN users purchaser ON purchaser.id = s.purchased_by
      WHERE s.id = $1
    `,
    [itemId],
  );

  return result.rows[0] ?? null;
}

async function fetchShoppingListByGroup(groupId: string) {
  const result = await query<ShoppingListRow>(
    `
      SELECT
        s.id,
        s.group_id,
        s.created_by,
        creator.full_name AS created_by_name,
        s.purchased_by,
        purchaser.full_name AS purchased_by_name,
        s.name,
        s.category,
        s.quantity,
        s.unit,
        s.notes,
        s.is_purchased,
        s.purchased_at,
        s.created_at,
        s.updated_at
      FROM shopping_list_items s
      LEFT JOIN users creator ON creator.id = s.created_by
      LEFT JOIN users purchaser ON purchaser.id = s.purchased_by
      WHERE s.group_id = $1
      ORDER BY s.is_purchased ASC, s.created_at DESC
    `,
    [groupId],
  );

  return result.rows;
}

async function buildAuthResponse(user: SessionUser, csrfToken: string): Promise<AuthResponse> {
  return {
    user,
    csrfToken,
  };
}

async function createEmailVerificationToken(client: PoolClient, userId: string) {
  const rawToken = createRandomToken(48);
  const tokenHash = hashToken(rawToken);

  await client.query(
    `
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + ($3 || ' hours')::interval)
      ON CONFLICT (user_id)
      DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        created_at = now()
    `,
    [userId, tokenHash, env.EMAIL_VERIFICATION_TTL_HOURS],
  );

  return rawToken;
}

async function createPasswordResetToken(client: PoolClient, userId: string) {
  const rawToken = createRandomToken(48);
  const tokenHash = hashToken(rawToken);

  await client.query(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + ($3 || ' hours')::interval)
      ON CONFLICT (user_id)
      DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        created_at = now()
    `,
    [userId, tokenHash, env.PASSWORD_RESET_TTL_HOURS],
  );

  return rawToken;
}

async function ensurePersonalGroup(client: PoolClient, user: SessionUser) {
  const existingGroup = await client.query<{ id: string }>(
    `
      SELECT g.id
      FROM groups g
      JOIN group_members gm
        ON gm.group_id = g.id
       AND gm.user_id = $1
       AND gm.role = 'owner'
      WHERE g.created_by = $1
      LIMIT 1
    `,
    [user.id],
  );

  if (existingGroup.rowCount) {
    return existingGroup.rows[0].id;
  }

  const createdGroup = await client.query<{ id: string }>(
    `
      INSERT INTO groups (name, created_by)
      VALUES ($1, $2)
      RETURNING id
    `,
    [buildPersonalGroupName(user.fullName), user.id],
  );

  await client.query(
    `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `,
    [createdGroup.rows[0].id, user.id],
  );

  return createdGroup.rows[0].id;
}

async function requireAuth(req: Request) {
  const auth = getAuth(req);

  if (!auth.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
  }

  return auth.user;
}

async function requireAdmin(req: Request) {
  const user = await requireAuth(req);

  if (user.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Anda tidak memiliki akses admin");
  }

  return user;
}

function requireCsrf(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return;
  }

  const auth = getAuth(req);
  const headerToken = req.header("x-csrf-token");

  if (!headerToken || headerToken !== auth.csrfToken) {
    throw new AppError(403, "INVALID_CSRF", "Token CSRF tidak valid");
  }
}

function createAuthRateLimiter() {
  return rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak percobaan autentikasi. Coba lagi nanti.",
      },
    },
  });
}

function buildForwardedRequestOrigin(req: Request) {
  const forwardedHost = req.header("x-forwarded-host") ?? req.header("host");
  const forwardedProto = req.header("x-forwarded-proto") ?? req.protocol;

  if (!forwardedHost || !forwardedProto) {
    return null;
  }

  const protocol = forwardedProto.split(",")[0].trim();
  const host = forwardedHost.split(",")[0].trim();

  if (!protocol || !host) {
    return null;
  }

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function isAllowedCorsOrigin(req: Request, origin: string | undefined) {
  if (!origin || env.allowedOrigins.includes(origin)) {
    return true;
  }

  if (origin !== "null") {
    return false;
  }

  const requestOrigin = buildForwardedRequestOrigin(req);
  return requestOrigin ? env.allowedOrigins.includes(requestOrigin) : false;
}

export function createApp() {
  const app = express();
  const authRateLimiter = createAuthRateLimiter();
  const hasFrontendBuild = fs.existsSync(frontendIndexFile);

  app.set("trust proxy", env.NODE_ENV === "production");
  app.use(
    cors((req, callback) => {
      const origin = req.header("origin");

      if (isAllowedCorsOrigin(req, origin)) {
        callback(null, {
          origin: true,
          credentials: true,
        });
        return;
      }

      callback(new AppError(403, "INVALID_ORIGIN", "Origin tidak diizinkan"), {
        origin: false,
        credentials: true,
      });
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  if (env.NODE_ENV === "production" && hasFrontendBuild) {
    app.use((req, res, next) => {
      if (req.method === "GET" && shouldNoIndexSpaPath(req.path)) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }

      next();
    });

    app.use(
      express.static(frontendDistDirectory, {
        index: false,
        maxAge: "1h",
      }),
    );

    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }

      if (shouldNoIndexSpaPath(req.path)) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }

      res.sendFile(frontendIndexFile, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  app.use(
    asyncHandler(async (req, res, next) => {
      const cookies = parseCookies(req.headers.cookie);
      const cookieNames = getCookieNames();
      const rawSessionToken = cookies[cookieNames.session] ?? null;
      const existingCsrfToken = cookies[cookieNames.csrf] ?? null;
      const fallbackCsrfToken = existingCsrfToken ?? createRandomToken(24);

      let session: SessionContext | null = null;

      if (rawSessionToken) {
        const client = await getPool().connect();

        try {
          session = await getSessionFromToken(client, rawSessionToken);
        } finally {
          client.release();
        }
      }

      const csrfToken = session?.csrfToken ?? fallbackCsrfToken;
      setCsrfCookie(res, csrfToken, session ? env.SESSION_TTL_HOURS * 60 * 60 : 24 * 60 * 60);

      (req as AuthenticatedRequest).auth = {
        session,
        user: session?.user ?? null,
        csrfToken,
        rawSessionToken,
      };

      if (!session && rawSessionToken) {
        clearAuthCookies(res);
      }

      next();
    }),
  );

  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      await query("SELECT 1");
      res.json({ status: "ok", database: "up" });
    }),
  );

  if (env.NODE_ENV !== "production") {
    app.get(
      "/api/dev/email-preview",
      asyncHandler(async (req, res) => {
        const template = z
          .enum(["verification", "reset-password"])
          .optional()
          .parse(typeof req.query.template === "string" ? req.query.template : undefined);
        const fullName =
          typeof req.query.name === "string" && req.query.name.trim().length > 0
            ? req.query.name.trim()
            : "Keluarga RumahQu";
        const baseUrl = buildRequestOrigin(req);

        if (!template) {
          res.type("html").send(renderEmailPreviewIndex(baseUrl));
          return;
        }

        const preview = renderEmailPreview(template, baseUrl, fullName);
        res.setHeader("x-email-preview-subject", preview.subject);
        res.type("html").send(preview.html);
      }),
    );
  }

  app.post(
    "/api/auth/register",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(registerSchema, req.body);
      const emailNormalized = normalizeEmail(input.email);
      const trimmedEmail = input.email.trim();
      const trimmedFullName = input.fullName.trim();
      const passwordHash = await hashPassword(input.password, {
        algorithm: Algorithm.Argon2id,
      });

      const registration = await withTransaction(async (client) => {
        const existing = await client.query<{ id: string; email_verified_at: Date | null }>(
          "SELECT id, email_verified_at FROM users WHERE email_normalized = $1",
          [emailNormalized],
        );

        let userId: string;

        if (existing.rowCount) {
          if (existing.rows[0].email_verified_at) {
            throw new AppError(409, "EMAIL_TAKEN", "Email sudah terdaftar");
          }

          userId = existing.rows[0].id;
          await client.query(
            `
              UPDATE users
              SET email = $2,
                  password_hash = $3,
                  full_name = $4
              WHERE id = $1
            `,
            [userId, trimmedEmail, passwordHash, trimmedFullName],
          );
        } else {
          const insertedUser = await client.query<{ id: string }>(
            `
              INSERT INTO users (email, email_normalized, password_hash, full_name)
              VALUES ($1, $2, $3, $4)
              RETURNING id
            `,
            [trimmedEmail, emailNormalized, passwordHash, trimmedFullName],
          );
          userId = insertedUser.rows[0].id;
        }

        const verificationToken = await createEmailVerificationToken(client, userId);
        return {
          email: trimmedEmail,
          fullName: trimmedFullName,
          verificationToken,
        };
      });

      const verificationUrl = buildVerificationUrl(req, registration.verificationToken);
      await sendVerificationEmail({
        email: registration.email,
        fullName: registration.fullName,
        verificationUrl,
      });

      res.status(202).json(buildRegisterResponse(registration.email, verificationUrl));
    }),
  );

  app.post(
    "/api/auth/resend-verification",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(resendVerificationSchema, req.body);
      const emailNormalized = normalizeEmail(input.email);

      const verification = await withTransaction(async (client) => {
        const userResult = await client.query<Pick<UserRow, "id" | "email" | "full_name" | "email_verified_at">>(
          `
            SELECT id, email, full_name, email_verified_at
            FROM users
            WHERE email_normalized = $1
          `,
          [emailNormalized],
        );

        if (!userResult.rowCount) {
          return null;
        }

        const userRow = userResult.rows[0];
        if (userRow.email_verified_at) {
          return null;
        }

        const verificationToken = await createEmailVerificationToken(client, userRow.id);
        return {
          email: userRow.email,
          fullName: userRow.full_name,
          verificationToken,
        };
      });

      if (verification) {
        const verificationUrl = buildVerificationUrl(req, verification.verificationToken);
        await sendVerificationEmail({
          email: verification.email,
          fullName: verification.fullName,
          verificationUrl,
        });
        res.json(buildVerificationEmailResponse(verification.email, verificationUrl));
        return;
      }

      res.json(buildVerificationEmailResponse());
    }),
  );

  app.post(
    "/api/auth/forgot-password",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(forgotPasswordSchema, req.body);
      const emailNormalized = normalizeEmail(input.email);

      const resetRequest = await withTransaction(async (client) => {
        const userResult = await client.query<Pick<UserRow, "id" | "email" | "full_name">>(
          `
            SELECT id, email, full_name
            FROM users
            WHERE email_normalized = $1
          `,
          [emailNormalized],
        );

        if (!userResult.rowCount) {
          return null;
        }

        const userRow = userResult.rows[0];
        const resetToken = await createPasswordResetToken(client, userRow.id);
        return {
          email: userRow.email,
          fullName: userRow.full_name,
          resetToken,
        };
      });

      if (resetRequest) {
        const resetUrl = buildPasswordResetUrl(resetRequest.resetToken);
        await sendPasswordResetEmail({
          email: resetRequest.email,
          fullName: resetRequest.fullName,
          resetUrl,
        });
        res.json(buildPasswordResetEmailResponse(resetRequest.email, resetUrl));
        return;
      }

      res.json(buildPasswordResetEmailResponse());
    }),
  );

  app.get(
    "/api/auth/verify-email",
    asyncHandler(async (req, res) => {
      const token = typeof req.query.token === "string" ? req.query.token : "";

      if (!token) {
        res.redirect(buildVerificationRedirectUrl("invalid"));
        return;
      }

      const verification = await withTransaction(async (client) => {
        const tokenResult = await client.query<EmailVerificationTokenRow>(
          `
            SELECT
              evt.user_id,
              evt.expires_at,
              u.id,
              u.email,
              u.full_name,
              u.avatar_url,
              u.created_at,
              u.role,
              u.password_hash,
              u.email_verified_at
            FROM email_verification_tokens evt
            JOIN users u ON u.id = evt.user_id
            WHERE evt.token_hash = $1
          `,
          [hashToken(token)],
        );

        if (!tokenResult.rowCount) {
          return { status: "invalid" as const };
        }

        const tokenRow = tokenResult.rows[0];

        if (tokenRow.expires_at.getTime() <= Date.now()) {
          await client.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [tokenRow.user_id]);
          return { status: "expired" as const };
        }

        const verifiedUserResult = await client.query<UserRow>(
          `
            UPDATE users
            SET email_verified_at = COALESCE(email_verified_at, now())
            WHERE id = $1
            RETURNING id, email, full_name, avatar_url, created_at, role, password_hash, email_verified_at
          `,
          [tokenRow.user_id],
        );

        await client.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [tokenRow.user_id]);

        const user = toSessionUser(verifiedUserResult.rows[0]);
        await ensurePersonalGroup(client, user);
        const sessionTokens = await createSession(client, user);
        return {
          status: "verified" as const,
          user,
          sessionTokens,
        };
      });

      if (verification.status === "invalid" || verification.status === "expired") {
        res.redirect(buildVerificationRedirectUrl(verification.status));
        return;
      }

      setSessionCookies(res, verification.sessionTokens.rawToken, verification.sessionTokens.csrfToken);
      res.redirect(new URL("/?verified=1", env.primaryAppOrigin).toString());
    }),
  );

  app.post(
    "/api/auth/login",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(loginSchema, req.body);
      const emailNormalized = normalizeEmail(input.email);

      const response = await withTransaction(async (client) => {
        const userResult = await client.query<UserRow>(
          `
            SELECT id, email, full_name, avatar_url, created_at, role, password_hash, email_verified_at
            FROM users
            WHERE email_normalized = $1
          `,
          [emailNormalized],
        );

        if (!userResult.rowCount) {
          throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah");
        }

        const userRow = userResult.rows[0];
        const passwordMatches = await verifyPassword(userRow.password_hash, input.password);

        if (!passwordMatches) {
          throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah");
        }

        if (!userRow.email_verified_at) {
          throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email belum diverifikasi. Cek inbox Anda untuk melanjutkan.", {
            email: userRow.email,
          });
        }

        const user = toSessionUser(userRow);
        const sessionTokens = await createSession(client, user);
        setSessionCookies(res, sessionTokens.rawToken, sessionTokens.csrfToken);
        return buildAuthResponse(user, sessionTokens.csrfToken);
      });

      res.json(response);
    }),
  );

  app.post(
    "/api/auth/reset-password",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(resetPasswordSchema, req.body);
      const passwordHash = await hashPassword(input.password, {
        algorithm: Algorithm.Argon2id,
      });

      await withTransaction(async (client) => {
        const tokenResult = await client.query<PasswordResetTokenRow>(
          `
            SELECT user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = $1
          `,
          [hashToken(input.token)],
        );

        if (!tokenResult.rowCount) {
          throw new AppError(400, "RESET_TOKEN_INVALID", "Link reset password tidak valid");
        }

        const tokenRow = tokenResult.rows[0];

        if (tokenRow.expires_at.getTime() <= Date.now()) {
          await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [tokenRow.user_id]);
          throw new AppError(400, "RESET_TOKEN_EXPIRED", "Link reset password sudah kedaluwarsa");
        }

        await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [tokenRow.user_id, passwordHash]);
        await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [tokenRow.user_id]);
        await client.query("DELETE FROM sessions WHERE user_id = $1", [tokenRow.user_id]);
      });

      res.json(buildPasswordResetResponse());
    }),
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const auth = getAuth(req);

      if (auth.rawSessionToken) {
        const client = await getPool().connect();

        try {
          await deleteSession(client, auth.rawSessionToken);
        } finally {
          client.release();
        }
      }

      clearAuthCookies(res);
      const csrfToken = createRandomToken(24);
      setCsrfCookie(res, csrfToken);

      const payload: SessionResponse = {
        user: null,
        csrfToken,
      };

      res.json(payload);
    }),
  );

  app.get(
    "/api/auth/me",
    asyncHandler(async (req, res) => {
      const auth = getAuth(req);
      const payload: SessionResponse = {
        user: auth.user,
        csrfToken: auth.csrfToken,
      };

      res.json(payload);
    }),
  );

  app.patch(
    "/api/me",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const input = parseBody(updateProfileSchema, req.body);

      const result = await query<UserRow>(
        `
          UPDATE users
          SET full_name = $2,
              avatar_url = $3
          WHERE id = $1
          RETURNING id, email, full_name, avatar_url, created_at, role, password_hash, email_verified_at
        `,
        [user.id, input.fullName, input.avatarUrl ?? null],
      );

      const updatedUser = toSessionUser(result.rows[0]);
      const authContext = getAuth(req);
      res.json(await buildAuthResponse(updatedUser, authContext.csrfToken));
    }),
  );

  app.get(
    "/api/admin/stats",
    asyncHandler(async (req, res) => {
      await requireAdmin(req);

      const [countsResult, dailySignupsResult] = await Promise.all([
        query<AdminUserCountsRow>(
          `
            SELECT
              COUNT(*)::int AS total_users,
              COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS verified_users
            FROM users
          `,
        ),
        query<DailySignupRow>(
          `
            SELECT
              day_series.signup_date,
              COALESCE(signups.signup_count, 0)::int AS signup_count
            FROM (
              SELECT generate_series(
                current_date - interval '29 days',
                current_date,
                interval '1 day'
              )::date AS signup_date
            ) day_series
            LEFT JOIN (
              SELECT
                DATE(created_at) AS signup_date,
                COUNT(*)::int AS signup_count
              FROM users
              WHERE created_at >= current_date - interval '29 days'
              GROUP BY DATE(created_at)
            ) signups
              ON signups.signup_date = day_series.signup_date
            ORDER BY day_series.signup_date ASC
          `,
        ),
      ]);

      const counts = countsResult.rows[0];
      const payload: AdminStatsResponse = {
        totalUsers: Number(counts.total_users),
        verifiedUsers: Number(counts.verified_users),
        dailySignups: dailySignupsResult.rows.map((row) => ({
          date:
            row.signup_date instanceof Date
              ? row.signup_date.toISOString().slice(0, 10)
              : String(row.signup_date),
          count: Number(row.signup_count),
        })),
      };

      res.json(payload);
    }),
  );

  app.get(
    "/api/admin/users",
    asyncHandler(async (req, res) => {
      await requireAdmin(req);

      const result = await query<AdminUserRow>(
        `
          SELECT
            id,
            email,
            full_name,
            role,
            created_at,
            email_verified_at
          FROM users
          ORDER BY created_at DESC, email ASC
        `,
      );

      const payload: AdminUsersResponse = {
        users: result.rows.map(toAdminUserSummary),
      };

      res.json(payload);
    }),
  );

  app.get(
    "/api/groups",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      res.json(await getGroupsResponse(user.id));
    }),
  );

  app.post(
    "/api/groups",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const input = parseBody(createGroupSchema, req.body);

      const result = await withTransaction(async (client) => {
        const createdGroup = await client.query<GroupRow>(
          `
            INSERT INTO groups (name, created_by)
            VALUES ($1, $2)
            RETURNING id, name, created_by, created_at, 'owner'::text AS role, 1::int AS member_count
          `,
          [input.name, user.id],
        );
        await client.query(
          `
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'owner')
          `,
          [createdGroup.rows[0].id, user.id],
        );
        return createdGroup.rows[0];
      });

      res.status(201).json(toGroupSummary(result));
    }),
  );

  app.get(
    "/api/groups/:groupId/members",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const groupId = getRouteParam(req.params.groupId, "groupId");
      await assertGroupMember(groupId, user.id);

      const result = await query<GroupMemberRow>(
        `
          SELECT
            gm.user_id,
            u.email,
            u.full_name,
            gm.role,
            gm.joined_at
          FROM group_members gm
          JOIN users u ON u.id = gm.user_id
          WHERE gm.group_id = $1
          ORDER BY CASE gm.role WHEN 'owner' THEN 0 ELSE 1 END, u.full_name ASC
        `,
        [groupId],
      );

      res.json({
        members: result.rows.map(toGroupMember),
      });
    }),
  );

  app.post(
    "/api/groups/:groupId/invites",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const groupId = getRouteParam(req.params.groupId, "groupId");
      const input = parseBody(inviteSchema, req.body);
      await assertGroupOwner(groupId, user.id);

      const emailNormalized = normalizeEmail(input.email);

      const invite = await withTransaction(async (client) => {
        const targetResult = await client.query<UserRow>(
          `
            SELECT id, email, full_name, avatar_url, created_at, role, password_hash, email_verified_at
            FROM users
            WHERE email_normalized = $1
          `,
          [emailNormalized],
        );

        if (!targetResult.rowCount) {
          throw new AppError(404, "USER_NOT_FOUND", "User dengan email tersebut belum terdaftar");
        }

        const targetUser = targetResult.rows[0];
        const memberResult = await client.query<{ user_id: string }>(
          "SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = $2",
          [groupId, targetUser.id],
        );

        if (memberResult.rowCount) {
          throw new AppError(409, "ALREADY_MEMBER", "User sudah menjadi anggota grup ini");
        }

        const insertedInvite = await client.query<{ id: string }>(
          `
            INSERT INTO group_invites (
              group_id,
              invited_user_id,
              invited_email,
              invited_email_normalized,
              invited_by
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (group_id, invited_user_id) DO NOTHING
            RETURNING id
          `,
          [groupId, targetUser.id, targetUser.email, emailNormalized, user.id],
        );

        if (!insertedInvite.rowCount) {
          throw new AppError(409, "INVITE_EXISTS", "User sudah diundang ke grup ini");
        }

        const inviteResult = await client.query<InviteRow>(
          `
            SELECT
              gi.id,
              gi.group_id,
              g.name AS group_name,
              gi.invited_email,
              gi.invited_by AS invited_by_user_id,
              inviter.full_name AS invited_by_full_name,
              gi.created_at
            FROM group_invites gi
            JOIN groups g ON g.id = gi.group_id
            JOIN users inviter ON inviter.id = gi.invited_by
            WHERE gi.id = $1
          `,
          [insertedInvite.rows[0].id],
        );

        return inviteResult.rows[0];
      });

      res.status(201).json(toPendingInvite(invite));
    }),
  );

  app.post(
    "/api/invites/:inviteId/accept",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const { inviteId } = req.params;

      const result = await withTransaction(async (client) => {
        const invite = await client.query<{ group_id: string; invited_user_id: string }>(
          `
            SELECT group_id, invited_user_id
            FROM group_invites
            WHERE id = $1
          `,
          [inviteId],
        );

        if (!invite.rowCount) {
          throw new AppError(404, "INVITE_NOT_FOUND", "Undangan tidak ditemukan");
        }

        const inviteRow = invite.rows[0];

        if (inviteRow.invited_user_id !== user.id) {
          throw new AppError(403, "FORBIDDEN", "Anda tidak dapat menerima undangan ini");
        }

        await client.query(
          `
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING
          `,
          [inviteRow.group_id, user.id],
        );
        await client.query("DELETE FROM group_invites WHERE id = $1", [inviteId]);
        return inviteRow.group_id;
      });

      res.json({ groupId: result });
    }),
  );

  app.post(
    "/api/invites/:inviteId/decline",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const { inviteId } = req.params;

      const inviteResult = await query<{ invited_user_id: string }>(
        "SELECT invited_user_id FROM group_invites WHERE id = $1",
        [inviteId],
      );

      if (!inviteResult.rowCount) {
        throw new AppError(404, "INVITE_NOT_FOUND", "Undangan tidak ditemukan");
      }

      if (inviteResult.rows[0].invited_user_id !== user.id) {
        throw new AppError(403, "FORBIDDEN", "Anda tidak dapat menolak undangan ini");
      }

      await query("DELETE FROM group_invites WHERE id = $1", [inviteId]);
      res.json({ success: true });
    }),
  );

  app.delete(
    "/api/groups/:groupId/members/:userId",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const groupId = getRouteParam(req.params.groupId, "groupId");
      const userId = getRouteParam(req.params.userId, "userId");

      const [actorRole, targetResult] = await Promise.all([
        getGroupRole(groupId, user.id),
        query<{ role: "owner" | "member" }>(
          "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
          [groupId, userId],
        ),
      ]);

      if (!actorRole) {
        throw new AppError(403, "FORBIDDEN", "Anda tidak memiliki akses ke grup ini");
      }

      if (!targetResult.rowCount) {
        throw new AppError(404, "MEMBER_NOT_FOUND", "Anggota tidak ditemukan");
      }

      const targetRole = targetResult.rows[0].role;

      if (user.id !== userId && actorRole !== "owner") {
        throw new AppError(403, "FORBIDDEN", "Hanya owner yang dapat menghapus anggota lain");
      }

      if (user.id === userId && targetRole === "owner") {
        throw new AppError(400, "OWNER_CANNOT_LEAVE", "Owner tidak dapat keluar dari grupnya sendiri");
      }

      await query("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
      res.json({ success: true });
    }),
  );

  app.get(
    "/api/meal-recommendations",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const parsedGroupId = z.string().uuid().safeParse(req.query.groupId);

      if (!parsedGroupId.success) {
        throw new AppError(400, "VALIDATION_ERROR", "groupId wajib diisi");
      }

      const groupId = parsedGroupId.data;
      await assertGroupMember(groupId, user.id);

      const inventoryRows = await fetchInventoryByGroup(groupId);
      const recommendations = buildMealRecommendations(inventoryRows.map(toInventoryItem));
      const catalogStats = getRecipeCatalogStats();
      const payload: MealRecommendationsResponse = {
        recommendations,
        generatedAt: new Date().toISOString(),
        totalCatalogRecipes: catalogStats.totalRecipes,
      };

      res.json(payload);
    }),
  );

  app.post(
    "/api/meal-recommendations/:recipeId/add-missing-to-shopping-list",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const recipeId = getRouteParam(req.params.recipeId, "recipeId");
      const input = parseBody(addMissingIngredientsSchema, req.body);
      await assertGroupMember(input.groupId, user.id);

      const recipe = getRecipeDefinitionById(recipeId);

      if (!recipe) {
        throw new AppError(404, "RECIPE_NOT_FOUND", "Resep tidak ditemukan");
      }

      const inventoryRows = await fetchInventoryByGroup(input.groupId);
      const missingIngredients = getMissingRequiredIngredientsForRecipe(
        recipeId,
        inventoryRows.map(toInventoryItem),
      );

      if (!missingIngredients) {
        throw new AppError(404, "RECIPE_NOT_FOUND", "Resep tidak ditemukan");
      }

      const existingShoppingItems = await fetchShoppingListByGroup(input.groupId);
      const activeShoppingKeys = new Set(
        existingShoppingItems
          .filter((item) => !item.is_purchased)
          .map((item) => `${normalizeCatalogText(item.name)}::${normalizeCatalogText(item.category)}`),
      );

      const addedItems: AddMissingIngredientsResponse["addedItems"] = [];
      const skippedItems: AddMissingIngredientsResponse["skippedItems"] = [];

      if (missingIngredients.length > 0) {
        await withTransaction(async (client) => {
          for (const ingredient of missingIngredients) {
            const key = `${normalizeCatalogText(ingredient.shoppingDefaults.name)}::${normalizeCatalogText(
              ingredient.shoppingDefaults.category,
            )}`;

            if (activeShoppingKeys.has(key)) {
              skippedItems.push({
                ingredientId: ingredient.id,
                name: ingredient.shoppingDefaults.name,
                reason: "already-in-shopping-list",
              });
              continue;
            }

            const inserted = await client.query<{ id: string }>(
              `
                INSERT INTO shopping_list_items (
                  group_id,
                  created_by,
                  name,
                  category,
                  quantity,
                  unit,
                  notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
              `,
              [
                input.groupId,
                user.id,
                ingredient.shoppingDefaults.name,
                ingredient.shoppingDefaults.category,
                ingredient.shoppingDefaults.quantity,
                ingredient.shoppingDefaults.unit,
                `Untuk menu: ${recipe.name}`,
              ],
            );

            activeShoppingKeys.add(key);
            addedItems.push({
              ingredientId: ingredient.id,
              shoppingListItemId: inserted.rows[0].id,
              name: ingredient.shoppingDefaults.name,
              category: ingredient.shoppingDefaults.category,
              quantity: ingredient.shoppingDefaults.quantity,
              unit: ingredient.shoppingDefaults.unit,
            });
          }
        });
      }

      const payload: AddMissingIngredientsResponse = {
        recipeId: recipe.id,
        recipeName: recipe.name,
        addedItems,
        skippedItems,
      };

      res.json(payload);
    }),
  );

  app.get(
    "/api/shopping-list",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const parsedGroupId = z.string().uuid().safeParse(req.query.groupId);

      if (!parsedGroupId.success) {
        throw new AppError(400, "VALIDATION_ERROR", "groupId wajib diisi");
      }

      const groupId = parsedGroupId.data;
      await assertGroupMember(groupId, user.id);
      const result = await fetchShoppingListByGroup(groupId);

      res.json({
        items: result.map(toShoppingListItem),
      });
    }),
  );

  app.post(
    "/api/shopping-list",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const input = parseBody(createShoppingListItemSchema, req.body);
      await assertGroupMember(input.groupId, user.id);

      const inserted = await query<{ id: string }>(
        `
          INSERT INTO shopping_list_items (
            group_id,
            created_by,
            name,
            category,
            quantity,
            unit,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [input.groupId, user.id, input.name, input.category, input.quantity, input.unit, input.notes ?? null],
      );

      const item = await fetchShoppingListItem(inserted.rows[0].id);
      res.status(201).json(toShoppingListItem(item!));
    }),
  );

  app.patch(
    "/api/shopping-list/:itemId",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const input = parseBody(updateShoppingListItemSchema, req.body);
      const item = await fetchShoppingListItem(itemId);

      if (!item) {
        throw new AppError(404, "SHOPPING_ITEM_NOT_FOUND", "Item belanja tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);

      const nextName = input.name ?? item.name;
      const nextCategory = input.category ?? item.category;
      const nextQuantity = input.quantity ?? item.quantity;
      const nextUnit = input.unit ?? item.unit;
      const nextNotes = input.notes === undefined ? item.notes : input.notes;
      const nextIsPurchased = input.isPurchased ?? item.is_purchased;
      const hasPurchaseStateChanged =
        input.isPurchased !== undefined && input.isPurchased !== item.is_purchased;
      const nextPurchasedBy = hasPurchaseStateChanged
        ? nextIsPurchased
          ? user.id
          : null
        : item.purchased_by;
      const nextPurchasedAt = hasPurchaseStateChanged
        ? nextIsPurchased
          ? new Date()
          : null
        : item.purchased_at;

      await query(
        `
          UPDATE shopping_list_items
          SET name = $2,
              category = $3,
              quantity = $4,
              unit = $5,
              notes = $6,
              is_purchased = $7,
              purchased_by = $8,
              purchased_at = $9
          WHERE id = $1
        `,
        [
          itemId,
          nextName,
          nextCategory,
          nextQuantity,
          nextUnit,
          nextNotes,
          nextIsPurchased,
          nextPurchasedBy,
          nextPurchasedAt,
        ],
      );

      const updatedItem = await fetchShoppingListItem(itemId);
      res.json(toShoppingListItem(updatedItem!));
    }),
  );

  app.delete(
    "/api/shopping-list/:itemId",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const item = await fetchShoppingListItem(itemId);

      if (!item) {
        throw new AppError(404, "SHOPPING_ITEM_NOT_FOUND", "Item belanja tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);
      await query("DELETE FROM shopping_list_items WHERE id = $1", [itemId]);
      res.status(204).send();
    }),
  );

  app.get(
    "/api/inventory",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const parsedGroupId = z.string().uuid().safeParse(req.query.groupId);

      if (!parsedGroupId.success) {
        throw new AppError(400, "VALIDATION_ERROR", "groupId wajib diisi");
      }

      const groupId = parsedGroupId.data;
      await assertGroupMember(groupId, user.id);
      const result = await fetchInventoryByGroup(groupId);

      res.json({
        items: result.map(toInventoryItem),
      });
    }),
  );

  app.post(
    "/api/inventory",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const input = parseBody(createInventoryItemSchema, req.body);
      await assertGroupMember(input.groupId, user.id);
      assertValidRestockSettings(input.lowStockThreshold ?? null, input.restockTargetQuantity ?? null);

      const result = await query<InventoryRow>(
        `
          INSERT INTO inventory_items (
            group_id,
            added_by,
            name,
            category,
            quantity,
            unit,
            low_stock_threshold,
            restock_target_quantity,
            expiration_date,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            id,
            group_id,
            added_by,
            NULL::text AS added_by_name,
            name,
            category,
            quantity,
            unit,
            low_stock_threshold,
            restock_target_quantity,
            expiration_date,
            notes,
            created_at,
            updated_at
        `,
        [
          input.groupId,
          user.id,
          input.name,
          input.category,
          input.quantity,
          input.unit,
          input.lowStockThreshold ?? null,
          input.restockTargetQuantity ?? null,
          normalizeExpirationDate(input.expirationDate),
          input.notes ?? null,
        ],
      );

      res.status(201).json(toInventoryItem(result.rows[0]));
    }),
  );

  app.patch(
    "/api/inventory/:itemId",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const input = parseBody(updateInventoryItemSchema, req.body);
      const item = await fetchInventoryItem(itemId);

      if (!item) {
        throw new AppError(404, "ITEM_NOT_FOUND", "Barang tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);

      const nextName = input.name ?? item.name;
      const nextCategory = input.category ?? item.category;
      const nextQuantity = input.quantity ?? item.quantity;
      const nextUnit = input.unit ?? item.unit;
      const nextLowStockThreshold =
        input.lowStockThreshold === undefined ? item.low_stock_threshold : input.lowStockThreshold;
      const nextRestockTargetQuantity =
        input.restockTargetQuantity === undefined ? item.restock_target_quantity : input.restockTargetQuantity;
      const nextExpirationDate = input.expirationDate
        ? normalizeExpirationDate(input.expirationDate)
        : item.expiration_date instanceof Date
          ? item.expiration_date.toISOString().slice(0, 10)
          : item.expiration_date;
      const nextNotes = input.notes === undefined ? item.notes : input.notes;
      assertValidRestockSettings(nextLowStockThreshold, nextRestockTargetQuantity);

      const result = await query<InventoryRow>(
        `
          UPDATE inventory_items
          SET name = $2,
              category = $3,
              quantity = $4,
              unit = $5,
              low_stock_threshold = $6,
              restock_target_quantity = $7,
              expiration_date = $8,
              notes = $9
          WHERE id = $1
          RETURNING
            id,
            group_id,
            added_by,
            NULL::text AS added_by_name,
            name,
            category,
            quantity,
            unit,
            low_stock_threshold,
            restock_target_quantity,
            expiration_date,
            notes,
            created_at,
            updated_at
        `,
        [
          itemId,
          nextName,
          nextCategory,
          nextQuantity,
          nextUnit,
          nextLowStockThreshold,
          nextRestockTargetQuantity,
          nextExpirationDate,
          nextNotes,
        ],
      );

      res.json(toInventoryItem(result.rows[0]));
    }),
  );

  app.get(
    "/api/inventory/:itemId/adjustments",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const item = await fetchInventoryItem(itemId);

      if (!item) {
        throw new AppError(404, "ITEM_NOT_FOUND", "Barang tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);

      const result = await query<InventoryAdjustmentRow>(
        `
          SELECT
            a.id,
            a.item_id,
            a.group_id,
            a.adjusted_by,
            actor.full_name AS adjusted_by_name,
            a.type,
            a.delta,
            a.quantity_before,
            a.quantity_after,
            a.reason,
            a.created_at
          FROM inventory_adjustments a
          LEFT JOIN users actor ON actor.id = a.adjusted_by
          WHERE a.item_id = $1
          ORDER BY a.created_at DESC
          LIMIT 20
        `,
        [itemId],
      );

      const payload: InventoryAdjustmentsResponse = {
        adjustments: result.rows.map(toInventoryAdjustment),
      };

      res.json(payload);
    }),
  );

  app.post(
    "/api/inventory/:itemId/adjustments",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const input = parseBody(adjustInventoryStockSchema, req.body);

      const updatedItem = await withTransaction(async (client) => {
        const itemResult = await client.query<InventoryRow>(
          `
            SELECT
              i.id,
              i.group_id,
              i.added_by,
              creator.full_name AS added_by_name,
              i.name,
              i.category,
              i.quantity,
              i.unit,
              i.low_stock_threshold,
              i.restock_target_quantity,
              i.expiration_date,
              i.notes,
              i.created_at,
              i.updated_at
            FROM inventory_items i
            LEFT JOIN users creator ON creator.id = i.added_by
            WHERE i.id = $1
            FOR UPDATE
          `,
          [itemId],
        );
        const item = itemResult.rows[0];

        if (!item) {
          throw new AppError(404, "ITEM_NOT_FOUND", "Barang tidak ditemukan");
        }

        await assertGroupMember(item.group_id, user.id);

        const quantityBefore = item.quantity;
        const quantityAfter =
          input.type === "add"
            ? quantityBefore + input.quantity
            : input.type === "use"
              ? quantityBefore - input.quantity
              : input.quantity;

        if (quantityAfter < 0) {
          throw new AppError(400, "NEGATIVE_STOCK", "Stok tidak boleh kurang dari 0");
        }

        const delta = quantityAfter - quantityBefore;

        const updateResult = await client.query<InventoryRow>(
          `
            UPDATE inventory_items
            SET quantity = $2
            WHERE id = $1
            RETURNING
              id,
              group_id,
              added_by,
              NULL::text AS added_by_name,
              name,
              category,
              quantity,
              unit,
              low_stock_threshold,
              restock_target_quantity,
              expiration_date,
              notes,
              created_at,
              updated_at
          `,
          [itemId, quantityAfter],
        );

        await client.query(
          `
            INSERT INTO inventory_adjustments (
              item_id,
              group_id,
              adjusted_by,
              type,
              delta,
              quantity_before,
              quantity_after,
              reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            itemId,
            item.group_id,
            user.id,
            input.type,
            delta,
            quantityBefore,
            quantityAfter,
            input.reason ?? null,
          ],
        );

        return updateResult.rows[0];
      });

      res.json(toInventoryItem(updatedItem));
    }),
  );

  app.post(
    "/api/inventory/:itemId/restock-suggestion",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const item = await fetchInventoryItem(itemId);

      if (!item) {
        throw new AppError(404, "ITEM_NOT_FOUND", "Barang tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);

      if (item.low_stock_threshold === null || item.restock_target_quantity === null) {
        throw new AppError(400, "RESTOCK_TARGET_REQUIRED", "Target restock belum diatur untuk barang ini");
      }

      if (item.quantity > item.low_stock_threshold) {
        throw new AppError(400, "ITEM_NOT_LOW_STOCK", "Stok barang belum melewati batas rendah");
      }

      const existingShoppingItems = await fetchShoppingListByGroup(item.group_id);
      const itemKey = `${normalizeCatalogText(item.name)}::${normalizeCatalogText(item.category)}`;
      const existingActiveItem = existingShoppingItems.find(
        (shoppingItem) =>
          !shoppingItem.is_purchased &&
          `${normalizeCatalogText(shoppingItem.name)}::${normalizeCatalogText(shoppingItem.category)}` === itemKey,
      );

      if (existingActiveItem) {
        const payload: RestockSuggestionResponse = {
          status: "already-in-shopping-list",
          shoppingListItem: toShoppingListItem(existingActiveItem),
        };
        res.json(payload);
        return;
      }

      const suggestedQuantity = item.restock_target_quantity - item.quantity;

      if (suggestedQuantity <= 0) {
        throw new AppError(400, "INVALID_RESTOCK_TARGET", "Target restock harus lebih besar dari stok saat ini");
      }

      const inserted = await query<{ id: string }>(
        `
          INSERT INTO shopping_list_items (
            group_id,
            created_by,
            name,
            category,
            quantity,
            unit,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [
          item.group_id,
          user.id,
          item.name,
          item.category,
          suggestedQuantity,
          item.unit,
          `Restock dari stok rendah: ${item.quantity} ${item.unit}`,
        ],
      );

      const shoppingListItem = await fetchShoppingListItem(inserted.rows[0].id);
      const payload: RestockSuggestionResponse = {
        status: "added",
        shoppingListItem: toShoppingListItem(shoppingListItem!),
      };

      res.status(201).json(payload);
    }),
  );

  app.delete(
    "/api/inventory/:itemId",
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const user = await requireAuth(req);
      const itemId = getRouteParam(req.params.itemId, "itemId");
      const item = await fetchInventoryItem(itemId);

      if (!item) {
        throw new AppError(404, "ITEM_NOT_FOUND", "Barang tidak ditemukan");
      }

      await assertGroupMember(item.group_id, user.id);
      await query("DELETE FROM inventory_items WHERE id = $1", [itemId]);
      res.status(204).send();
    }),
  );

  app.use((_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Endpoint tidak ditemukan"));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logError(error);

    if (error instanceof z.ZodError) {
      const appError = handleZodError(error);
      res.status(appError.statusCode).json({
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Terjadi kesalahan pada server",
      },
    });
  });

  return app;
}
