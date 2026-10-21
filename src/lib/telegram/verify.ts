import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedTelegramUser = {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
};

export type TelegramVerifyResult =
  | { ok: true; user: VerifiedTelegramUser; authDate: number; isDevFallback?: boolean }
  | { ok: false; error: string };

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export function createSignedTelegramInitData(
  user: { id: number | string; first_name: string; last_name?: string; username?: string },
  botToken: string,
  authDate = Math.floor(Date.now() / 1000),
): string {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAHdF6IQAAAAAN0XohDhrOrc");
  params.set("user", JSON.stringify(user));

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

export function verifyTelegramInitData(
  rawInitData: string,
  botToken = process.env.TELEGRAM_BOT_TOKEN,
): TelegramVerifyResult {
  const trimmed = rawInitData.trim();
  if (!trimmed) {
    return { ok: false, error: "Не переданы данные запуска Telegram (initData)." };
  }

  const params = new URLSearchParams(trimmed);
  const providedHash = params.get("hash");
  const userRaw = params.get("user");
  const authDateRaw = Number(params.get("auth_date"));

  if (!providedHash || !userRaw || !Number.isFinite(authDateRaw)) {
    return { ok: false, error: "Формат initData некорректен или не содержит подписи." };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authDateRaw) > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "Сессия Telegram устарела. Перезапустите Mini App из бота." };
  }

  const tokenToUse =
    botToken?.trim() ||
    (process.env.NODE_ENV !== "production" && providedHash.startsWith("dev_")
      ? "dev-telegram-bot-token"
      : "");

  if (!tokenToUse) {
    return {
      ok: false,
      error: "Сервер не настроен для проверки подписи Telegram (отсутствует TELEGRAM_BOT_TOKEN).",
    };
  }

  let isSignatureValid = false;
  let isDevFallback = false;

  if (process.env.NODE_ENV !== "production" && providedHash === "dev_local_preview") {
    isSignatureValid = true;
    isDevFallback = true;
  } else {
    const pairs: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key === "hash") continue;
      pairs.push(`${key}=${value}`);
    }
    pairs.sort((a, b) => a.localeCompare(b));
    const dataCheckString = pairs.join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(tokenToUse).digest();
    const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const expectedBuffer = Buffer.from(calculatedHash, "hex");
    const providedBuffer = Buffer.from(providedHash, "hex");

    if (
      expectedBuffer.length > 0 &&
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      isSignatureValid = true;
    }
  }

  if (!isSignatureValid) {
    return { ok: false, error: "Подпись Telegram initData не прошла серверную проверку." };
  }

  try {
    const parsedUser = JSON.parse(userRaw) as {
      id?: number | string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };

    if (!parsedUser || (typeof parsedUser.id !== "number" && typeof parsedUser.id !== "string")) {
      return { ok: false, error: "Профиль Telegram в initData повреждён." };
    }

    const firstName = String(parsedUser.first_name ?? "Покупатель").trim() || "Покупатель";

    return {
      ok: true,
      authDate: authDateRaw,
      isDevFallback,
      user: {
        id: String(parsedUser.id),
        firstName,
        ...(parsedUser.last_name ? { lastName: String(parsedUser.last_name).trim() } : {}),
        ...(parsedUser.username ? { username: String(parsedUser.username).trim() } : {}),
      },
    };
  } catch {
    return { ok: false, error: "Не удалось прочитать данные пользователя Telegram." };
  }
}
