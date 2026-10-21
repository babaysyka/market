import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { profiles, telegramLinks, userRoles } from "@/lib/db/schema";
import { verifyTelegramInitData } from "@/lib/telegram/verify";

type LinkRequestBody = {
  initData?: unknown;
  email?: unknown;
  name?: unknown;
  confirmLink?: unknown;
};

export async function POST(request: Request) {
  let body: LinkRequestBody;
  try {
    body = (await request.json()) as LinkRequestBody;
  } catch {
    return NextResponse.json({ message: "Некорректный формат запроса." }, { status: 400 });
  }

  if (body.confirmLink !== true) {
    return NextResponse.json(
      { message: "Для связывания аккаунтов требуется явное подтверждение пользователя." },
      { status: 400 },
    );
  }

  const initData = typeof body.initData === "string" ? body.initData : "";
  const verification = verifyTelegramInitData(initData);
  if (!verification.ok) {
    return NextResponse.json({ message: verification.error }, { status: 401 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Укажите корректный email аккаунта магазина." }, { status: 400 });
  }

  const tgUser = verification.user;
  const fallbackName =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : [tgUser.firstName, tgUser.lastName].filter(Boolean).join(" ") || "Покупатель";

  const userId = `usr_${email.replace(/[^a-z0-9]/g, "_")}`;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      linked: true,
      account: { userId, name: fallbackName, email },
      telegramUser: tgUser,
    });
  }

  try {
    const db = getDatabase();

    await db
      .insert(profiles)
      .values({
        userId,
        email,
        fullName: fallbackName,
      })
      .onConflictDoUpdate({
        target: profiles.email,
        set: {
          fullName: fallbackName,
          updatedAt: new Date(),
        },
      });

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    const resolvedUserId = profile?.userId ?? userId;
    const resolvedName = profile?.fullName ?? fallbackName;

    await db
      .insert(userRoles)
      .values({
        userId: resolvedUserId,
        role: "customer",
      })
      .onConflictDoNothing();

    await db
      .insert(telegramLinks)
      .values({
        telegramUserId: tgUser.id,
        userId: resolvedUserId,
        telegramUsername: tgUser.username ?? null,
        firstName: tgUser.firstName,
      })
      .onConflictDoUpdate({
        target: telegramLinks.telegramUserId,
        set: {
          userId: resolvedUserId,
          telegramUsername: tgUser.username ?? null,
          firstName: tgUser.firstName,
          linkedAt: new Date(),
        },
      });

    return NextResponse.json({
      linked: true,
      account: {
        userId: resolvedUserId,
        name: resolvedName,
        email,
      },
      telegramUser: tgUser,
    });
  } catch {
    return NextResponse.json(
      { message: "Не удалось сохранить привязку Telegram-аккаунта в базе." },
      { status: 500 },
    );
  }
}
