import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export function detectImageMimeFromBytes(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется вход в аккаунт." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Не удалось прочитать загружаемый файл." }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Файл аватара не передан." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { message: "Размер изображения должен быть до 2 МБ." },
      { status: 400 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageMimeFromBytes(buffer);

  if (!detectedMime) {
    return NextResponse.json(
      { message: "Разрешены только изображения JPEG, PNG или WebP." },
      { status: 400 },
    );
  }

  const ext = detectedMime === "image/png" ? "png" : detectedMime === "image/webp" ? "webp" : "jpg";
  const randomKey = `avatars/${sessionUser.userId}/${randomBytes(12).toString("hex")}.${ext}`;

  const db = getDatabase();
  await db
    .update(profiles)
    .set({
      avatarKey: randomKey,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, sessionUser.userId));

  return NextResponse.json({
    avatarKey: randomKey,
    mimeType: detectedMime,
    message: "Фото профиля обновлено.",
  });
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: "Требуется вход в аккаунт." }, { status: 401 });
  }

  const db = getDatabase();
  await db
    .update(profiles)
    .set({
      avatarKey: null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, sessionUser.userId));

  return NextResponse.json({
    avatarKey: null,
    message: "Фото профиля удалено.",
  });
}
