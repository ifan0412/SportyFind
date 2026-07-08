"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/SupabaseProvider";
import { BackButton } from "@/components/BackButton";
import { AccountManagementTab } from "@/components/profile/AccountManagementTab";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";

export default function ProfileAccountSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回我的檔案" href="/profile" />
        <AccountManagementTab userEmail={user.email} identities={user.identities} />
      </div>
    </div>
  );
}
