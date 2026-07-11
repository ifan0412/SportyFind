"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/SupabaseProvider";
import { BackButton } from "@/components/BackButton";
import { AccountManagementTab } from "@/components/profile/AccountManagementTab";
import { EmailVerificationGate } from "@/components/profile/EmailVerificationBanner";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { Loader2 } from "lucide-react";

function AccountSettingsContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-20 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <EmailVerificationGate>
      <AccountManagementTab
        user={user}
        userEmail={user.email}
        identities={user.identities}
      />
    </EmailVerificationGate>
  );
}

export default function ProfileAccountSettingsPage() {
  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回我的檔案" href="/profile" />
        <Suspense
          fallback={
            <div className="flex justify-center py-20 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          }
        >
          <AccountSettingsContent />
        </Suspense>
      </div>
    </div>
  );
}
