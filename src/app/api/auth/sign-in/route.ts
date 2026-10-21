import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createServerSession, verifyPassword } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { authCredentials, profiles, userRoles } from "@/lib/db/schema";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный формат запроса входа." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "Введите email и пароль." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: "База данных недоступна." }, { status: 503 });
  }

  try {
    const db = getDatabase();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ message: "Неверный email или пароль." }, { status: 401 });
    }

    const [cred] = await db
      .select()
      .from(authCredentials)
      .where(eq(authCredentials.userId, profile.userId))
      .limit(1);

    if (!cred || !verifyPassword(password, cred.passwordHash)) {
      return NextResponse.json({ message: "Неверный email или пароль." }, { status: 401 });
    }

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, profile.userId))
      .limit(1);

    const sessionToken = await createServerSession(profile.userId);

    return NextResponse.json({
      user: {
        userId: profile.userId,
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone ?? null,
        avatarKey: profile.avatarKey ?? null,
        role: roleRow?.role ?? "customer",
      },
      sessionToken,
    });
  } catch {
    return NextResponse.json({ message: "Ошибка входа. Повторите попытку." }, { status: 500 });
  }
}
