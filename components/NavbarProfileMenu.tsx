"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Users, GraduationCap, Activity, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminTeamLink {
  id: string;
  name: string;
}

export interface ProfileNavData {
  is_coach: boolean;
  is_physio: boolean;
  adminTeams: AdminTeamLink[];
}

const MY_TEAMS_HREF = "/profile?tab=teams";

export function ProfileNavMenu({
  pathname,
  profileNav,
  onNavigate,
  variant,
}: {
  pathname: string;
  profileNav: ProfileNavData;
  onNavigate?: () => void;
  variant: "desktop" | "mobile-menu";
}) {
  const searchParams = useSearchParams();
  const onProfilePage = pathname === "/profile";
  const isProfileIconActive = onProfilePage;
  const isCoachActive = pathname.startsWith("/dashboard/coach");
  const isPhysioActive = pathname.startsWith("/dashboard/physio");
  const friendsHref = "/profile?tab=friends";
  const isTeamsTabActive = pathname === "/profile" && searchParams.get("tab") === "teams";

  const menuItemActive = (active: boolean) => !onProfilePage && active;

  const profileIconClass = cn(
    "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 bg-slate-900",
    isProfileIconActive
      ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400"
      : "border-slate-700 text-slate-400 hover:border-slate-400 hover:text-white"
  );

  const menuItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-bold rounded-xl transition-colors text-left whitespace-nowrap",
      menuItemActive(active) ? "bg-blue-600/15 text-blue-400" : "text-zinc-300 hover:bg-slate-800 hover:text-white"
    );

  if (variant === "mobile-menu") {
    return (
      <>
        <li>
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap",
              menuItemActive(false) ? "text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
            onClick={onNavigate}
          >
            <User className="size-4 shrink-0" /> 個人檔案管理
          </Link>
        </li>
        {profileNav.is_coach && (
          <li>
            <Link
              href="/dashboard/coach"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap",
                isCoachActive ? "text-orange-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              onClick={onNavigate}
            >
              <GraduationCap className="size-4 shrink-0" /> 教練後台管理
            </Link>
          </li>
        )}
        {profileNav.is_physio && (
          <li>
            <Link
              href="/dashboard/physio"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap",
                isPhysioActive ? "text-green-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              onClick={onNavigate}
            >
              <Activity className="size-4 shrink-0" /> 復健後台管理
            </Link>
          </li>
        )}
        <li>
          <Link
            href={friendsHref}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap",
              menuItemActive(false) ? "text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
            onClick={onNavigate}
          >
            <Users className="size-4 shrink-0" /> 好友列表
          </Link>
        </li>
        <li>
          <Link
            href={MY_TEAMS_HREF}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap",
              isTeamsTabActive ? "text-purple-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
            onClick={onNavigate}
          >
            <Shield className="size-4 shrink-0" /> 我的團體
          </Link>
        </li>
      </>
    );
  }

  return (
    <div className="relative group">
      <Link href="/profile" className={profileIconClass} title="我的檔案">
        <User className="size-4" />
      </Link>
      <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-1.5">
          <Link href="/profile" className={menuItemClass(false)}>
            <User className="size-4 shrink-0" />
            我的檔案
          </Link>
          <Link href={friendsHref} className={menuItemClass(false)}>
            <Users className="size-4 shrink-0" />
            好友列表
          </Link>
          <Link href={MY_TEAMS_HREF} className={menuItemClass(isTeamsTabActive)}>
            <Shield className="size-4 shrink-0" />
            我的團體
          </Link>
          {profileNav.is_coach && (
            <Link href="/dashboard/coach" className={menuItemClass(isCoachActive)}>
              <GraduationCap className="size-4 shrink-0" />
              教練後台管理
            </Link>
          )}
          {profileNav.is_physio && (
            <Link href="/dashboard/physio" className={menuItemClass(isPhysioActive)}>
              <Activity className="size-4 shrink-0" />
              復健後台管理
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
