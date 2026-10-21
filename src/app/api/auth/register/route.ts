import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  createServerSession,
  hashPassword,
  resolveUserIdFromEmail,
} from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { authCredentials, profiles, userRoles } from "@/lib/db/schema";

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный запрос регистрации." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rawName = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Пароль должен содержать не менее 8 символов." },
      { status: 400 },
    );
  }

  const name =
    rawName ||
    email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("ru"));

  const userId = resolveUserIdFromEmail(email);

  if (!process.env.DATABASE_URL) {
    const token = await createServerSession(userId);
    return NextResponse.json({
      user: { userId, name, email, phone: null, avatarKey: null, role: "customer" },
      sessionToken: token,
    });
  }

  try {
    const db = getDatabase();
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    const targetUserId = existingProfile?.userId ?? userId;

    if (existingProfile) {
      const [existingCred] = await db
        .select()
        .from(authCredentials)
        .where(eq(authCredentials.userId, targetUserId))
        .limit(1);

      if (existingCred) {
        return NextResponse.json(
          { message: "Аккаунт с таким email уже зарегистрирован. Выполните вход." },
          { status: 409 },
        );
      }
    } else {
      await db.insert(profiles).values({
        userId: targetUserId,
        email,
        fullName: name,
      });
    }

    await db
      .insert(userRoles)
      .values({
        userId: targetUserId,
        role: "customer",
      })
      .onConflictDoNothing();

    await db
      .insert(authCredentials)
      .values({
        userId: targetUserId,
        passwordHash: hashPassword(password),
      })
      .onConflictDoUpdate({
        target: authCredentials.userId,
        set: {
          passwordHash: hashPassword(password),
          updatedAt: new Date(),
        },
      });

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, targetUserId))
      .limit(1);

    const sessionToken = await createServerSession(targetUserId);

    return NextResponse.json({
      user: {
        userId: targetUserId,
        name: existingProfile?.fullName ?? name,
        email,
        phone: existingProfile?.phone ?? null,
        avatarKey: existingProfile?.avatarKey ?? null,
        role: roleRow?.role ?? "customer",
      },
      sessionToken,
    });
  } catch {
    return NextResponse.json(
      { message: "Не удалось создать аккаунт. Попробуйте позже." },
      { status: 500 },
    );
  }
}
