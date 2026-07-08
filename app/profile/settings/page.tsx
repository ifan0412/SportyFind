"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/SupabaseProvider";
import { BackButton } from "@/components/BackButton";
import { ProfileSettingsList } from "@/components/profile/ProfileSettingsList";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回我的檔案" href="/profile" />
        <ProfileSettingsList />
      </div>
    </div>
  );
}
