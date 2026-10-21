import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";
import {
  authCredentials,
  authSessions,
  passwordResetTokens,
  profiles,
  userRoles,
  type UserRole,
} from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "em_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type AuthenticatedUser = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  avatarKey: string | null;
  role: UserRole;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, originalHex] = parts;
  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, "hex");
  if (derived.length !== original.length) return false;
  return timingSafeEqual(derived, original);
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function resolveUserIdFromEmail(email: string): string {
  return `usr_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

export async function createServerSession(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  if (process.env.DATABASE_URL) {
    const db = getDatabase();
    await db.insert(authSessions).values({
      tokenHash,
      userId,
      expiresAt,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

export async function destroyServerSession(request?: Request): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const headerAuth = request?.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7).trim() : undefined;
  const rawToken = cookieToken || bearerToken;

  if (rawToken && process.env.DATABASE_URL) {
    try {
      const db = getDatabase();
      await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(rawToken)));
    } catch {
      // Ignore cleanup errors on sign-out.
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(request?: Request): Promise<AuthenticatedUser | null> {
  if (!process.env.DATABASE_URL) return null;

  let rawToken: string | undefined;
  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // Cookies may not be available outside request context.
  }

  if (!rawToken && request) {
    const headerAuth = request.headers.get("authorization");
    if (headerAuth?.startsWith("Bearer ")) {
      rawToken = headerAuth.slice(7).trim();
    }
  }

  if (!rawToken) return null;

  try {
    const db = getDatabase();
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const rows = await db
      .select({
        userId: profiles.userId,
        email: profiles.email,
        fullName: profiles.fullName,
        phone: profiles.phone,
        avatarKey: profiles.avatarKey,
        role: userRoles.role,
      })
      .from(authSessions)
      .innerJoin(profiles, eq(authSessions.userId, profiles.userId))
      .leftJoin(userRoles, eq(userRoles.userId, profiles.userId))
      .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, now)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      userId: row.userId,
      email: row.email,
      name: row.fullName,
      phone: row.phone ?? null,
      avatarKey: row.avatarKey ?? null,
      role: row.role === "admin" ? "admin" : "customer",
    };
  } catch {
    return null;
  }
}

export async function issuePasswordResetToken(email: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1);

  if (!profile) return null;

  const rawToken = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await db.insert(passwordResetTokens).values({
    tokenHash,
    userId: profile.userId,
    expiresAt,
  });

  return rawToken;
}

export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const db = getDatabase();
  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!record) return false;

  const passwordHash = hashPassword(newPassword);

  await db
    .insert(authCredentials)
    .values({
      userId: record.userId,
      passwordHash,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: authCredentials.userId,
      set: {
        passwordHash,
        updatedAt: now,
      },
    });

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  return true;
}
