"use client";

import React, { ReactElement } from "react";

export interface UserSport {
  sports?: { name: string } | null;
  metadata?: { position?: string | null } | null;
}

export interface AthleteCardData {
  full_name?: string | null;
  headline?: string | null;
  avatar_url?: string | null;
  status_tag?: "open_to_team" | "looking_for_sub" | "training" | string | null;
  is_coach?: boolean | null;
  user_sports?: UserSport[] | null;
}

const STATUS_BADGE: Record<string, ReactElement> = {
  open_to_team: (
    <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-full font-black">
      🟢 尋找球隊
    </span>
  ),
  looking_for_sub: (
    <span className="bg-amber-500/10 text-amber-400 text-xs px-3 py-1 rounded-full font-black">
      🟡 可替補
    </span>
  ),
};

const defaultBadge = (
  <span className="bg-pro-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold">
    ⚪ 訓練中
  </span>
);

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AthleteCard({
  card,
  onClick,
}: {
  card: AthleteCardData;
  onClick: () => void;
}) {
  const position = card.user_sports?.[0]?.metadata?.position;
  const statusBadge = STATUS_BADGE[card.status_tag ?? ""] ?? defaultBadge;

  return (
    <div
      onClick={onClick}
      className="bg-pro-slate-900 border border-pro-slate-800 hover:border-pro-slate-600 rounded-3xl p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-950 flex flex-col justify-between cursor-pointer group"
    >
      <div className="space-y-4">

        {/* Avatar row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-16 h-16 rounded-2xl bg-pro-slate-800 border-2 border-pro-slate-700 bg-cover bg-center shrink-0 flex items-center justify-center text-xl font-black text-slate-500"
            style={{
              backgroundImage: card.avatar_url ? `url(${card.avatar_url})` : "none",
            }}
          >
            {!card.avatar_url && getInitials(card.full_name)}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {card.is_coach && (
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded">
                🏆 教練
              </span>
            )}
            {statusBadge}
          </div>
        </div>

        {/* Name + headline */}
        <div>
          <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition">
            {card.full_name ?? "—"}
          </h3>
          {position && (
            <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">
              {position}
            </p>
          )}
          {card.headline && (
            <p className="text-xs font-bold text-blue-400 mt-0.5 line-clamp-1">
              {card.headline}
            </p>
          )}
        </div>

        {/* Sports tags */}
        {card.user_sports && card.user_sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {card.user_sports.map((us, i) => (
              <span
                key={i}
                className="bg-pro-slate-950 text-slate-300 border border-pro-slate-800 text-[10px] font-black px-2.5 py-1 rounded-lg"
              >
                🏅 {us.sports?.name}
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}