"use client";

import { useState } from "react";

import { AccountIcon } from "@/shared/ui/workspace-icons";

export function PersonAvatar({
  userId,
  updatedAt,
  className = "size-10",
}: {
  userId: string;
  updatedAt: Date | string | null | undefined;
  className?: string;
}) {
  const version = updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
  if (version) return <ProfileImage key={`${userId}:${version}`} userId={userId} version={version} className={className} />;

  return <AvatarFallback className={className} />;
}

function ProfileImage({ userId, version, className }: { userId: string; version: string; className: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={`/api/profile-images/${userId}?v=${encodeURIComponent(version)}`}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return <AvatarFallback className={className} />;
}

function AvatarFallback({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted)] ${className}`}>
      <AccountIcon className="size-[58%]" />
    </span>
  );
}
