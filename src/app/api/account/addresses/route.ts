import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { addresses } from "@/lib/db/schema";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется вход в аккаунт." }, { status: 401 });
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, sessionUser.userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

  return NextResponse.json({ addresses: rows });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется вход в аккаунт." }, { status: 401 });
  }

  let body: {
    recipientName?: unknown;
    recipientPhone?: unknown;
    city?: unknown;
    streetAddress?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный формат адреса." }, { status: 400 });
  }

  const recipientName =
    typeof body.recipientName === "string" && body.recipientName.trim()
      ? body.recipientName.trim()
      : sessionUser.name;
  const recipientPhone =
    typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : "";
  const city =
    typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Ташкент";
  const streetAddress =
    typeof body.streetAddress === "string" ? body.streetAddress.trim() : "";

  if (!recipientPhone || !streetAddress) {
    return NextResponse.json(
      { message: "Укажите телефон получателя и улицу/дом доставки." },
      { status: 400 },
    );
  }

  const db = getDatabase();
  const [inserted] = await db
    .insert(addresses)
    .values({
      userId: sessionUser.userId,
      recipientName,
      recipientPhone,
      city,
      streetAddress,
      isDefault: true,
    })
    .returning();

  return NextResponse.json({ address: inserted });
}
