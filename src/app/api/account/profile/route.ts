import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { authCredentials, profiles } from "@/lib/db/schema";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется авторизация." }, { status: 401 });
  }

  return NextResponse.json({ profile: sessionUser });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется вход в аккаунт." }, { status: 401 });
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    newPassword?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректные данные профиля." }, { status: 400 });
  }

  const nextName =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : sessionUser.name;
  const nextPhone =
    typeof body.phone === "string" ? body.phone.trim() || null : sessionUser.phone;
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword && newPassword.length < 8) {
    return NextResponse.json(
      { message: "Новый пароль должен содержать не менее 8 символов." },
      { status: 400 },
    );
  }

  const db = getDatabase();
  const now = new Date();

  await db
    .update(profiles)
    .set({
      fullName: nextName,
      phone: nextPhone,
      updatedAt: now,
    })
    .where(eq(profiles.userId, sessionUser.userId));

  if (newPassword) {
    const passwordHash = hashPassword(newPassword);
    await db
      .insert(authCredentials)
      .values({
        userId: sessionUser.userId,
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
  }

  return NextResponse.json({
    profile: {
      ...sessionUser,
      name: nextName,
      phone: nextPhone,
    },
    message: "Настройки профиля сохранены.",
  });
}
