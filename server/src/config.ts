import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_ORIGIN: z.string().default("http://localhost:8080"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 14),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().positive().default(2),
  SMTP_HOST: z.string().optional().transform((value) => value?.trim() ?? ""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional().transform((value) => value?.trim() ?? ""),
  SMTP_PASS: z.string().optional().transform((value) => value?.trim() ?? ""),
  SMTP_FROM: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "RumahQu <no-reply@rumahqu.local>"),
  GOOGLE_CLIENT_ID: z.string().optional().transform((value) => value?.trim() ?? ""),
  GOOGLE_CLIENT_SECRET: z.string().optional().transform((value) => value?.trim() ?? ""),
});

const parsedEnv = envSchema.parse(process.env);

function parseAllowedOrigins(value: string, nodeEnv: "development" | "test" | "production") {
  const configuredOrigins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (nodeEnv === "development") {
    const developmentDefaults = ["http://localhost:8080", "http://localhost:8081"];
    return Array.from(new Set([...configuredOrigins, ...developmentDefaults]));
  }

  if (configuredOrigins.length === 0) {
    throw new Error("APP_ORIGIN must contain at least one origin");
  }

  return configuredOrigins;
}

export const env = {
  ...parsedEnv,
  allowedOrigins: parseAllowedOrigins(parsedEnv.APP_ORIGIN, parsedEnv.NODE_ENV),
  primaryAppOrigin: parsedEnv.APP_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)[0] ?? "http://localhost:8080",
};
