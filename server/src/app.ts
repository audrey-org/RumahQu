import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { verify as verifyPassword, hash as hashPassword, Algorithm } from "@node-rs/argon2";
import type {
  AuthResponse,
  GroupMember,
  GroupSummary,
  InventoryItem,
  ShoppingListItem,
  PendingInvite,
  SessionResponse,
  SessionUser,
} from "../../shared/contracts.js";
import { env } from "./config.js";
import { getPool, query, withTransaction } from "./db/pool.js";
import { AppError } from "./errors.js";
import { logError, requestLogger } from "./logger.js";
import {
  clearAuthCookies,
  createRandomToken,
  createSession,
  deleteSession,
  getCookieNames,
  getSessionFromToken,
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
  password_hash: string;
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
  expiration_date: string | Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDirectory = path.resolve(__dirname, "../../../dist");
const frontendIndexFile = path.join(frontendDistDirectory, "index.html");

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(255),
  fullName: z.string().trim().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(255),
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
  quantity: z.number().int().positive(),
  unit: z.string().trim().min(1).max(40),
  expirationDate: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional(),
});

const updateInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    quantity: z.number().int().positive().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    expirationDate: z.string().trim().min(1).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated",
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
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
    expirationDate,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
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

async function buildAuthResponse(user: SessionUser, csrfToken: string): Promise<AuthResponse> {
  return {
    user,
    csrfToken,
  };
}

async function requireAuth(req: Request) {
  const auth = getAuth(req);

  if (!auth.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu");
  }

  return auth.user;
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

export function createApp() {
  const app = express();
  const authRateLimiter = createAuthRateLimiter();
  const hasFrontendBuild = fs.existsSync(frontendIndexFile);

  app.set("trust proxy", env.NODE_ENV === "production");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, "INVALID_ORIGIN", "Origin tidak diizinkan"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  if (env.NODE_ENV === "production" && hasFrontendBuild) {
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

  app.post(
    "/api/auth/register",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      requireCsrf(req);
      const input = parseBody(registerSchema, req.body);
      const emailNormalized = normalizeEmail(input.email);

      const response = await withTransaction(async (client) => {
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM users WHERE email_normalized = $1",
          [emailNormalized],
        );

        if (existing.rowCount) {
          throw new AppError(409, "EMAIL_TAKEN", "Email sudah terdaftar");
        }

        const passwordHash = await hashPassword(input.password, {
          algorithm: Algorithm.Argon2id,
        });

        const insertedUser = await client.query<UserRow>(
          `
            INSERT INTO users (email, email_normalized, password_hash, full_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, full_name, avatar_url, created_at, password_hash
          `,
          [input.email.trim(), emailNormalized, passwordHash, input.fullName],
        );
        const user = toSessionUser(insertedUser.rows[0]);

        const firstName = input.fullName.trim().split(/\s+/)[0] || "Keluarga";
        const groupName = `Rumah ${firstName}`;
        const createdGroup = await client.query<{ id: string }>(
          `
            INSERT INTO groups (name, created_by)
            VALUES ($1, $2)
            RETURNING id
          `,
          [groupName, user.id],
        );
        await client.query(
          `
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'owner')
          `,
          [createdGroup.rows[0].id, user.id],
        );

        const sessionTokens = await createSession(client, user);
        setSessionCookies(res, sessionTokens.rawToken, sessionTokens.csrfToken);
        return buildAuthResponse(user, sessionTokens.csrfToken);
      });

      res.status(201).json(response);
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
            SELECT id, email, full_name, avatar_url, created_at, password_hash
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

        const user = toSessionUser(userRow);
        const sessionTokens = await createSession(client, user);
        setSessionCookies(res, sessionTokens.rawToken, sessionTokens.csrfToken);
        return buildAuthResponse(user, sessionTokens.csrfToken);
      });

      res.json(response);
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
          RETURNING id, email, full_name, avatar_url, created_at, password_hash
        `,
        [user.id, input.fullName, input.avatarUrl ?? null],
      );

      const updatedUser = toSessionUser(result.rows[0]);
      const authContext = getAuth(req);
      res.json(await buildAuthResponse(updatedUser, authContext.csrfToken));
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
            SELECT id, email, full_name, avatar_url, created_at, password_hash
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
    "/api/shopping-list",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req);
      const parsedGroupId = z.string().uuid().safeParse(req.query.groupId);

      if (!parsedGroupId.success) {
        throw new AppError(400, "VALIDATION_ERROR", "groupId wajib diisi");
      }

      const groupId = parsedGroupId.data;
      await assertGroupMember(groupId, user.id);

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

      res.json({
        items: result.rows.map(toShoppingListItem),
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

      res.json({
        items: result.rows.map(toInventoryItem),
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

      const result = await query<InventoryRow>(
        `
          INSERT INTO inventory_items (
            group_id,
            added_by,
            name,
            category,
            quantity,
            unit,
            expiration_date,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            group_id,
            added_by,
            NULL::text AS added_by_name,
            name,
            category,
            quantity,
            unit,
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
      const nextExpirationDate = input.expirationDate
        ? normalizeExpirationDate(input.expirationDate)
        : item.expiration_date instanceof Date
          ? item.expiration_date.toISOString().slice(0, 10)
          : item.expiration_date;
      const nextNotes = input.notes === undefined ? item.notes : input.notes;

      const result = await query<InventoryRow>(
        `
          UPDATE inventory_items
          SET name = $2,
              category = $3,
              quantity = $4,
              unit = $5,
              expiration_date = $6,
              notes = $7
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
            expiration_date,
            notes,
            created_at,
            updated_at
        `,
        [itemId, nextName, nextCategory, nextQuantity, nextUnit, nextExpirationDate, nextNotes],
      );

      res.json(toInventoryItem(result.rows[0]));
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
