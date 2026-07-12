"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/SupabaseProvider";
import { registerServiceWorker } from "@/lib/push/client";
import { supportsWebPush } from "@/lib/push/platform";
import { PushNotificationReminder } from "@/components/push/PushNotificationReminder";

export function PushNotificationProvider() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !supportsWebPush()) return;
    registerServiceWorker();
  }, [user]);

  if (!user) return null;

  return <PushNotificationReminder />;
}
