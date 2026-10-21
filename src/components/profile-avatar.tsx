"use client";

import Image from "next/image";
import { UserCircle } from "@phosphor-icons/react";
import { useState } from "react";

type ProfileAvatarProps = {
  name: string;
  avatarKey?: string | null;
  src?: string | null;
  size?: number;
  preview?: boolean;
  onImageError?: () => void;
};

export function ProfileAvatar({
  name,
  avatarKey,
  src,
  size = 62,
  preview = false,
  onImageError,
}: ProfileAvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ru");
  const imageSrc = src ?? (avatarKey ? `/api/account/avatar?v=${encodeURIComponent(avatarKey)}` : null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const style = { width: size, height: size, borderRadius: size <= 72 ? 19 : 22 };

  if (imageSrc && failedSource !== imageSrc) {
    return (
      <span className="profile-avatar-frame" style={style}>
        <span className="avatar-placeholder profile-avatar-fallback" style={style} aria-hidden="true">
          {initials || <UserCircle size={25} />}
        </span>
        <Image
          className="profile-avatar-photo"
          src={imageSrc}
          alt={preview ? "Предпросмотр фото профиля" : `Фото профиля: ${name}`}
          width={size}
          height={size}
          unoptimized
          onLoad={() => setLoadedSource(imageSrc)}
          onError={() => {
            setFailedSource(imageSrc);
            onImageError?.();
          }}
          style={{ ...style, opacity: loadedSource === imageSrc ? 1 : 0 }}
        />
      </span>
    );
  }

  return (
    <span
      className="avatar-placeholder"
      aria-label={`Профиль ${name}`}
      style={style}
    >
      {initials || <UserCircle size={25} aria-hidden="true" />}
    </span>
  );
}
