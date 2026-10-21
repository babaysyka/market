import { createPublicKey, verify as verifySignature } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createServerSession, resolveUserIdFromEmail } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { profiles, userRoles } from "@/lib/db/schema";

export const runtime = "nodejs";

type GoogleJwk = JsonWebKey & { kid?: string };
type GoogleClaims = {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  name?: string;
  sub?: string;
};

export async function POST(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Вход через Google пока не настроен." }, { status: 503 });
  const expectedOrigin = process.env.URL ? new URL(process.env.URL).origin : request.nextUrl.origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    return NextResponse.json({ error: "Источник запроса не подтверждён." }, { status: 403 });
  }

  let credential: unknown;
  try {
    const body: unknown = await request.json();
    credential = typeof body === "object" && body !== null ? (body as { credential?: unknown }).credential : null;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать ответ Google." }, { status: 400 });
  }
  if (typeof credential !== "string" || credential.length > 16_000) {
    return NextResponse.json({ error: "Ответ Google имеет неверный формат." }, { status: 400 });
  }

  const [encodedHeader, encodedClaims, encodedSignature, extra] = credential.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature || extra) {
    return NextResponse.json({ error: "Ответ Google имеет неверный формат." }, { status: 401 });
  }

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: string; kid?: string };
    const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as GoogleClaims;
    if (header.alg !== "RS256" || !header.kid) {
      return NextResponse.json({ error: "Не удалось подтвердить подпись Google." }, { status: 401 });
    }

    const keyResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cache: "no-store" });
    if (!keyResponse.ok) throw new Error("Google keys unavailable");
    const keySet = await keyResponse.json() as { keys?: GoogleJwk[] };
    const jwk = keySet.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return NextResponse.json({ error: "Ключ подписи Google не найден." }, { status: 401 });

    const publicKey = createPublicKey({ key: jwk, format: "jwk" } as Parameters<typeof createPublicKey>[0]);
    const validSignature = verifySignature(
      "RSA-SHA256",
      Buffer.from(encodedHeader + "." + encodedClaims),
      publicKey,
      Buffer.from(encodedSignature, "base64url"),
    );
    const now = Math.floor(Date.now() / 1000);
    const validClaims = claims.aud === clientId
      && (claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com")
      && typeof claims.exp === "number" && claims.exp > now
      && typeof claims.iat === "number" && claims.iat <= now + 60
      && typeof claims.sub === "string" && claims.sub.length > 0
      && typeof claims.email === "string" && claims.email_verified === true;

    if (!validSignature || !validClaims) {
      return NextResponse.json({ error: "Не удалось подтвердить аккаунт Google." }, { status: 401 });
    }
    if (typeof claims.email !== "string") {
      return NextResponse.json({ error: "В ответе Google нет подтверждённого email." }, { status: 401 });
    }

    const email = claims.email.toLowerCase();
    const displayName = claims.name?.trim() || email;
    const fallbackUserId = resolveUserIdFromEmail(email);
    let resolvedUserId = fallbackUserId;
    let role: "customer" | "admin" = "customer";

    if (process.env.DATABASE_URL) {
      const db = getDatabase();
      await db
        .insert(profiles)
        .values({
          userId: fallbackUserId,
          email,
          fullName: displayName,
        })
        .onConflictDoUpdate({
          target: profiles.email,
          set: {
            fullName: displayName,
            updatedAt: new Date(),
          },
        });

      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, email))
        .limit(1);

      resolvedUserId = existing?.userId ?? fallbackUserId;

      await db
        .insert(userRoles)
        .values({ userId: resolvedUserId, role: "customer" })
        .onConflictDoNothing();

      const [roleRow] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, resolvedUserId))
        .limit(1);

      if (roleRow?.role === "admin") role = "admin";
    }

    const sessionToken = await createServerSession(resolvedUserId);

    return NextResponse.json({
      user: {
        userId: resolvedUserId,
        name: displayName,
        email,
        role,
      },
      sessionToken,
    });
  } catch {
    return NextResponse.json({ error: "Сервис Google сейчас недоступен. Попробуй позже." }, { status: 502 });
  }
}
