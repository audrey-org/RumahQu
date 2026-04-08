import crypto from "node:crypto";
import type { Response } from "express";
import { parse, serialize } from "cookie";
import type { PoolClient } from "pg";
import { env } from "./config.js";
import type { SessionUser } from "../../shared/contracts.js";

const SESSION_COOKIE_NAME = "rumahqu_session";
const CSRF_COOKIE_NAME = "rumahqu_csrf";

type CookieOptions = {
  httpOnly: boolean;
  maxAge: number;
};

type SessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: Date;
  role: SessionUser["role"];
  session_expires_at: Date;
  csrf_token: string;
};

export interface SessionContext {
  id: string;
  user: SessionUser;
  csrfToken: string;
  expiresAt: string;
}

function appendSetCookie(res: Response, value: string) {
  const current = res.getHeader("Set-Cookie");

  if (!current) {
    res.setHeader("Set-Cookie", [value]);
    return;
  }

  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, value]);
    return;
  }

  res.setHeader("Set-Cookie", [String(current), value]);
}

function setCookie(res: Response, name: string, value: string, options: CookieOptions) {
  appendSetCookie(
    res,
    serialize(name, value, {
      httpOnly: options.httpOnly,
      maxAge: options.maxAge,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      path: "/",
    }),
  );
}

export function clearAuthCookies(res: Response) {
  appendSetCookie(
    res,
    serialize(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      path: "/",
      expires: new Date(0),
    }),
  );
}

export function setCsrfCookie(res: Response, token: string, maxAge = 24 * 60 * 60) {
  setCookie(res, CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    maxAge,
  });
}

export function setSessionCookies(res: Response, token: string, csrfToken: string) {
  const maxAge = env.SESSION_TTL_HOURS * 60 * 60;

  setCookie(res, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge,
  });
  setCsrfCookie(res, csrfToken, maxAge);
}

export function parseCookies(header: string | undefined) {
  return parse(header ?? "");
}

export function createRandomToken(size = 32) {
  return crypto.randomBytes(size).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

export async function createSession(client: PoolClient, user: SessionUser) {
  const rawToken = createRandomToken(48);
  const csrfToken = createRandomToken(32);
  const tokenHash = hashToken(rawToken);

  await client.query(
    `
      INSERT INTO sessions (user_id, token_hash, csrf_token, expires_at)
      VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)
    `,
    [user.id, tokenHash, csrfToken, env.SESSION_TTL_HOURS],
  );

  return {
    rawToken,
    csrfToken,
  };
}

function mapSessionRow(row: SessionRow): SessionContext {
  return {
    id: row.session_id,
    csrfToken: row.csrf_token,
    expiresAt: row.session_expires_at.toISOString(),
    user: {
      id: row.user_id,
      email: row.email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at.toISOString(),
      role: row.role,
    },
  };
}

export async function getSessionFromToken(client: PoolClient, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const result = await client.query<SessionRow>(
    `
      SELECT
        s.id AS session_id,
        s.csrf_token,
        s.expires_at AS session_expires_at,
        u.id AS user_id,
        u.email,
        u.full_name,
        u.avatar_url,
        u.created_at,
        u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
    `,
    [tokenHash],
  );

  if (!result.rowCount) {
    return null;
  }

  await client.query("UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1", [tokenHash]);

  return mapSessionRow(result.rows[0]);
}

export async function deleteSession(client: PoolClient, rawToken: string) {
  await client.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(rawToken)]);
}

export function getCookieNames() {
  return {
    session: SESSION_COOKIE_NAME,
    csrf: CSRF_COOKIE_NAME,
  };
}
