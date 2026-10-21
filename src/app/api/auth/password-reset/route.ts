import { NextResponse } from "next/server";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { email?: unknown; token?: unknown; newPassword?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный формат запроса." }, { status: 400 });
  }

  if (typeof body.token === "string" && typeof body.newPassword === "string") {
    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { message: "Новый пароль должен быть не короче 8 символов." },
        { status: 400 },
      );
    }

    const updated = await consumePasswordResetToken(body.token, body.newPassword);
    if (!updated) {
      return NextResponse.json(
        { message: "Код восстановления недействителен или истёк." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      reset: true,
      message: "Пароль успешно обновлён. Теперь вы можете войти с новым паролем.",
    });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  const resetToken = await issuePasswordResetToken(email);

  return NextResponse.json({
    requested: true,
    message:
      "Инструкция по сбросу пароля создана. Используйте проверочный код для установки нового пароля.",
    ...(process.env.NODE_ENV !== "production" && resetToken ? { resetToken } : {}),
  });
}
