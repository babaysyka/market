"use client";

import Image from "next/image";
import { UserCircle } from "@phosphor-icons/react";
import { useState } from "react";

type ProfileAvatarProps = {
  name: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  src?: string | null;
  size?: number;
  shape?: "rounded" | "circle";
  responsive?: boolean;
  className?: string;
  preview?: boolean;
  onImageError?: () => void;
};

export function ProfileAvatar({
  name,
  avatarKey,
  avatarUrl,
  src,
  size = 62,
  shape = "rounded",
  responsive = false,
  className,
  preview = false,
  onImageError,
}: ProfileAvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ru");
  const imageSrc = src ?? (avatarKey ? `/api/account/avatar?v=${encodeURIComponent(avatarKey)}` : avatarUrl ?? null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const borderRadius = shape === "circle" ? "50%" : size <= 72 ? 19 : 22;
  const style = {
    ...(responsive ? {} : { width: size, height: size }),
    borderRadius,
  };
  const responsiveClass = responsive ? " profile-avatar-responsive" : "";
  const extraClass = className ? ` ${className}` : "";

  if (imageSrc && failedSource !== imageSrc) {
    return (
      <span className={`profile-avatar-frame${responsiveClass}${extraClass}`} style={style}>
        <span className={`avatar-placeholder profile-avatar-fallback${responsiveClass}${extraClass}`} style={style} aria-hidden="true">
          {initials || <UserCircle size={25} />}
        </span>
        <Image
          className="profile-avatar-photo"
          alt={preview ? "Предпросмотр фото профиля" : `Фото профиля: ${name}`}
          src={imageSrc}
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
      className={`avatar-placeholder${responsiveClass}${extraClass}`}
      aria-label={`Профиль ${name}`}
      style={style}
    >
      {initials || <UserCircle size={25} aria-hidden="true" />}
    </span>
  );
}
