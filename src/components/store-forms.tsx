"use client";

import { CheckCircle, CloudArrowUp, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useStore, type StoreUser } from "@/components/store-provider";

export function StoreNote({ children }: { children: React.ReactNode }) {
  return <p className="store-note"><CheckCircle size={16} weight="fill" aria-hidden="true" />{children}</p>;
}

export function AuthForm({ mode }: { mode: "sign-in" | "register" }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const router = useRouter();
  const { setAuthenticatedUser } = useStore();
  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const submittedName = String(formData.get("name") ?? "").trim();

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/sign-in";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: submittedName || undefined,
          email,
          password,
        }),
      });

      const data = (await response.json()) as {
        user?: StoreUser;
        message?: string;
      };

      if (!response.ok || !data.user) {
        setMessage(data.message ?? "Не удалось выполнить вход. Проверьте введённые данные.");
        setSubmitting(false);
        return;
      }

      setAuthenticatedUser(data.user);
      setMessage(isRegister ? "Аккаунт создан. Добро пожаловать!" : "Вы успешно вошли в аккаунт.");
      const requested = new URLSearchParams(window.location.search).get("next");
      const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/account/profile";
      router.replace(next);
    } catch {
      setMessage("Ошибка соединения с сервером. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("resetEmail") ?? "").trim().toLowerCase();
    const token = String(formData.get("token") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, newPassword } : { email }),
      });
      const data = (await response.json()) as { message?: string; resetToken?: string; reset?: boolean };
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      if (data.reset) {
        setResetMode(false);
        setResetToken("");
      }
      setMessage(data.message ?? "Запрос на восстановление пароля обработан.");
    } catch {
      setMessage("Не удалось отправить запрос восстановления пароля.");
    }
  }

  if (resetMode) {
    return (
      <form className="form-stack" onSubmit={handlePasswordReset}>
        <label>
          Email аккаунта
          <input name="resetEmail" type="email" placeholder="name@example.com" required={!resetToken} />
        </label>
        {resetToken && (
          <>
            <label>
              Код подтверждения
              <input name="token" defaultValue={resetToken} required />
            </label>
            <label>
              Новый пароль
              <input name="newPassword" type="password" minLength={8} placeholder="Не короче 8 символов" required />
            </label>
          </>
        )}
        <button className="button button-primary button-wide" type="submit">
          {resetToken ? "Сохранить новый пароль" : "Получить код сброса пароля"}
        </button>
        <button
          className="button button-outline button-wide"
          type="button"
          onClick={() => {
            setResetMode(false);
            setMessage("");
          }}
        >
          Вернуться ко входу
        </button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    );
  }

  return <form className="form-stack" onSubmit={handleSubmit}>
    {isRegister && <label>Ваше имя<input name="name" autoComplete="name" placeholder="Например, Азиза" required /></label>}
    <label>Email<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
    <label>Пароль<input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Не короче 8 символов" minLength={8} required /></label>
    {isRegister && <label className="check-label"><input type="checkbox" required /><span>Согласен с условиями обработки персональных данных</span></label>}
    <button className="button button-primary button-wide" type="submit" disabled={submitting}>
      {submitting ? "Подождите…" : isRegister ? "Создать аккаунт" : "Войти в аккаунт"}
    </button>
    {!isRegister && (
      <button
        type="button"
        className="button-link"
        onClick={() => {
          setResetMode(true);
          setMessage("");
        }}
      >
        Забыли пароль? Восстановить доступ
      </button>
    )}
    <div className="auth-divider"><span>или</span></div>
    <GoogleSignInButton onMessage={setMessage} />
    {message && <p className="form-message" role="status">{message}</p>}
  </form>;
}

export function CheckoutForm({
  onComplete,
}: {
  onComplete: (orderId: string) => void;
}) {
  const { cart, user, clearCart } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const idempotencyKeyRef = useRef(
    `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const isMiniApp =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-tg-miniapp") === "true";

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          name,
          phone,
          address,
          source: isMiniApp ? "telegram_mini_app" : "web",
          idempotencyKey: idempotencyKeyRef.current,
          items: cart,
        }),
      });

      const payload = (await response.json()) as {
        order?: { id: string };
        message?: string;
      };

      if (!response.ok || !payload.order) {
        setErrorMessage(
          payload.message ?? "Не удалось оформить заказ. Проверьте сеть и попробуйте снова.",
        );
        setSubmitting(false);
        return;
      }

      clearCart();
      onComplete(payload.order.id);
    } catch {
      setErrorMessage("Ошибка соединения с сервером. Проверьте сеть и нажмите ещё раз.");
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>
        Имя получателя
        <input
          name="name"
          defaultValue={user?.name ?? ""}
          autoComplete="name"
          placeholder="Имя и фамилия"
          required
        />
      </label>
      <label>
        Телефон
        <input
          name="phone"
          type="tel"
          defaultValue={user?.phone ?? ""}
          autoComplete="tel"
          placeholder="+998 90 000 00 00"
          required
        />
      </label>
      <label>
        Адрес доставки
        <input
          name="address"
          autoComplete="street-address"
          placeholder="Город, улица и дом"
          required
        />
      </label>
      {errorMessage && (
        <p className="form-message is-error" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        className="button button-primary button-wide"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Оформляем заказ…" : "Подтвердить заказ"}
      </button>
    </form>
  );
}

export function SettingsForm() {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFilename, setAvatarFilename] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [savedAvatarUnavailable, setSavedAvatarUnavailable] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const { user, setAuthenticatedUser } = useStore();

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
  }, []);

  function clearAvatarPreview(clearInput = true) {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    avatarObjectUrlRef.current = null;
    setAvatarPreview(null);
    setAvatarFilename("");
    if (clearInput && avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    clearAvatarPreview(false);
    setAvatarError("");

    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      event.currentTarget.value = "";
      setAvatarError("Размер изображения должен быть до 2 МБ.");
      return;
    }

    if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.currentTarget.value = "";
      setAvatarError("Выберите изображение JPEG, PNG или WebP.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setAvatarFilename(file.name);
    setSavedAvatarUnavailable(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const newPassword = String(formData.get("password") ?? "");
    const avatarFile = formData.get("avatar");

    if (avatarFile instanceof File && avatarFile.size > 2 * 1024 * 1024) {
      setAvatarError("Размер изображения должен быть до 2 МБ.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const profileResponse = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || user.name,
          phone,
          ...(newPassword ? { newPassword } : {}),
        }),
      });

      const profileData = (await profileResponse.json()) as {
        profile?: StoreUser;
        message?: string;
      };

      if (!profileResponse.ok) {
        setMessage(profileData.message ?? "Не удалось сохранить настройки профиля.");
        setSaving(false);
        return;
      }

      let updatedAvatarKey = profileData.profile?.avatarKey ?? user.avatarKey ?? null;
      let uploadedAvatar = false;

      if (avatarFile instanceof File && avatarFile.size > 0) {
        const uploadData = new FormData();
        uploadData.set("avatar", avatarFile);
        const avatarRes = await fetch("/api/account/avatar", {
          method: "POST",
          body: uploadData,
        });
        const avatarJson = (await avatarRes.json()) as {
          avatarKey?: string | null;
          message?: string;
        };
        if (!avatarRes.ok) {
          setMessage(avatarJson.message ?? "Не удалось загрузить аватар.");
          setSaving(false);
          return;
        }
        updatedAvatarKey = avatarJson.avatarKey ?? null;
        uploadedAvatar = true;
        setSavedAvatarUnavailable(false);
      }

      setAuthenticatedUser({
        ...user,
        name: name || user.name,
        phone: phone || null,
        avatarKey: updatedAvatarKey,
      });
      if (uploadedAvatar) clearAvatarPreview();
      setMessage("Настройки профиля сохранены на сервере.");
    } catch {
      setMessage("Ошибка соединения при сохранении профиля.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });
      if (response.ok) {
        setAuthenticatedUser({ ...user, avatarKey: null });
        clearAvatarPreview();
        setSavedAvatarUnavailable(false);
        setMessage("Фото профиля удалено.");
      }
    } catch {
      setMessage("Не удалось удалить фото профиля.");
    }
  }

  return <form className="form-stack" onSubmit={handleSubmit}>
    <label>Имя<input name="name" defaultValue={user?.name ?? ""} autoComplete="name" /></label>
    <label>Телефон<input name="phone" type="tel" defaultValue={user?.phone ?? ""} placeholder="+998 90 000 00 00" autoComplete="tel" /></label>
    <label>Новый пароль<input name="password" type="password" placeholder="Не короче 8 символов" minLength={8} /></label>
    <div className="avatar-settings-preview">
      <ProfileAvatar
        name={user?.name ?? "Профиль"}
        avatarKey={user?.avatarKey}
        src={avatarPreview}
        size={76}
        preview={Boolean(avatarPreview)}
        onImageError={() => setSavedAvatarUnavailable(true)}
      />
      <div className="avatar-settings-copy" aria-live="polite">
        <strong>{avatarPreview ? "Предпросмотр нового фото" : "Фото профиля"}</strong>
        <p>
          {avatarPreview
            ? "После сохранения фото появится в вашем аккаунте."
            : user?.avatarKey && !savedAvatarUnavailable
              ? "Это фото видно в личном кабинете."
              : "Фото пока не отображается. Выберите файл, чтобы загрузить его заново."}
        </p>
      </div>
      {avatarPreview && (
        <button className="button button-outline avatar-preview-cancel" type="button" onClick={() => clearAvatarPreview()}>
          Отменить выбор
        </button>
      )}
    </div>
    <label className="upload-field">Фото профиля (JPEG, PNG, WebP до 2 МБ)<span><CloudArrowUp size={18} /> {avatarFilename || (user?.avatarKey ? "Выбрать другое фото" : "Выбрать изображение")}<input ref={avatarInputRef} name="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} /></span></label>
    {avatarError && <p className="form-message is-error" role="alert">{avatarError}</p>}
    <div className="hero-cta-row">
      <button className="button button-primary" type="submit" disabled={saving}>
        {saving ? "Сохраняем…" : "Сохранить изменения"}
      </button>
      {user?.avatarKey && (
        <button className="button button-outline" type="button" onClick={handleRemoveAvatar}>
          <Trash size={16} /> Удалить фото
        </button>
      )}
    </div>
    {message && <p className="form-message" role="status">{message}</p>}
  </form>;
}

export function AdminProductForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const priceUzs = Number(formData.get("priceUzs") ?? 0);
    const description = String(formData.get("description") ?? "").trim();

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, priceUzs, description }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? "Товар добавлен в каталог." : "Ошибка доступа."));
      if (response.ok) {
        event.currentTarget.reset();
      }
    } catch {
      setMessage("Не удалось сохранить товар.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="form-stack" onSubmit={handleSubmit}>
    <label>Название товара<input name="name" placeholder="Например, Samsung Galaxy A36 5G" required /></label>
    <label>Цена, сум<input name="priceUzs" type="number" min="1" placeholder="0" required /></label>
    <label>Описание<textarea name="description" placeholder="Коротко о товаре" required /></label>
    <button className="button button-primary" type="submit" disabled={submitting}>
      {submitting ? "Сохраняем…" : "Добавить товар"}
    </button>
    {message && <p className="form-message" role="status">{message}</p>}
  </form>;
}

export function OrderStatusControl({ orderId = "EM-2608", initialStatus = "new" }: { orderId?: string; initialStatus?: string }) {
  const [message, setMessage] = useState("");

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.currentTarget.value;
    const labelText = event.currentTarget.selectedOptions[0]?.textContent ?? nextValue;

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextValue }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? `Статус изменён: «${labelText}».`);
    } catch {
      setMessage(`Статус изменён: «${labelText}».`);
    }
  }

  return <label className="admin-order-control">Статус<select defaultValue={initialStatus} onChange={handleChange}><option value="new">Новый</option><option value="assembly">Собирается</option><option value="delivery">Передан в доставку</option><option value="done">Завершён</option></select>{message && <span role="status">{message}</span>}</label>;
}
