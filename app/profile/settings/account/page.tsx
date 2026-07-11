"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/SupabaseProvider";
import { BackButton } from "@/components/BackButton";
import { AccountManagementTab } from "@/components/profile/AccountManagementTab";
import { EmailVerificationGate } from "@/components/profile/EmailVerificationBanner";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function AccountSettingsContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [phoneSmsPendingAdminReview, setPhoneSmsPendingAdminReview] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("phone_e164, phone_verified_at, phone_sms_pending_admin_review")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPhoneE164(data?.phone_e164 ?? null);
        setPhoneVerifiedAt(data?.phone_verified_at ?? null);
        setPhoneSmsPendingAdminReview(Boolean(data?.phone_sms_pending_admin_review));
      });
  }, [supabase, user]);

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
        phoneE164={phoneE164}
        phoneVerifiedAt={phoneVerifiedAt}
        phoneSmsPendingAdminReview={phoneSmsPendingAdminReview}
      />
    </EmailVerificationGate>
  );
}

export default function ProfileAccountSettingsPage() {
  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
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
