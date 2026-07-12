"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/CookieConsent";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { AppDialogProvider } from "@/components/providers/AppDialogProvider";
import { SiteAnnouncementHost } from "@/components/announcements/SiteAnnouncementHost";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AppDialogProvider>
        {children}
        <SiteAnnouncementHost />
      </AppDialogProvider>
      <PageViewTracker />
      <Toaster richColors closeButton position="top-right" />
      <CookieConsent />
    </QueryClientProvider>
  );
}