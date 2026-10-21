import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { profiles, telegramLinks } from "@/lib/db/schema";
import { verifyTelegramInitData } from "@/lib/telegram/verify";

type AuthRequestBody = {
  initData?: unknown;
};

export async function POST(request: Request) {
  let body: AuthRequestBody;
  try {
    body = (await request.json()) as AuthRequestBody;
  } catch {
    return NextResponse.json({ message: "Некорректный JSON-запрос." }, { status: 400 });
  }

  const initData = typeof body.initData === "string" ? body.initData : "";
  const verification = verifyTelegramInitData(initData);

  if (!verification.ok) {
    return NextResponse.json({ message: verification.error }, { status: 401 });
  }

  const tgUser = verification.user;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      verified: true,
      telegramUser: tgUser,
      linkedAccount: null,
    });
  }

  try {
    const db = getDatabase();
    const existingLink = await db
      .select({
        userId: profiles.userId,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(telegramLinks)
      .innerJoin(profiles, eq(telegramLinks.userId, profiles.userId))
      .where(eq(telegramLinks.telegramUserId, tgUser.id))
      .limit(1);

    const linked = existingLink[0] ?? null;

    return NextResponse.json({
      verified: true,
      telegramUser: tgUser,
      linkedAccount: linked
        ? { userId: linked.userId, name: linked.fullName, email: linked.email }
        : null,
    });
  } catch {
    return NextResponse.json({
      verified: true,
      telegramUser: tgUser,
      linkedAccount: null,
    });
  }
}
