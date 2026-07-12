import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getVapidPublicKey,
  isPushServerConfigured,
  isVapidPrivateKeyConfigured,
} from "@/lib/push/server";
import { hasServiceRoleClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error?.code === "42P01") {
    return NextResponse.json({
      vapidPublicConfigured: Boolean(getVapidPublicKey()),
      vapidPrivateConfigured: isVapidPrivateKeyConfigured(),
      serviceRoleConfigured: hasServiceRoleClient(),
      serverReady: false,
      subscriptionCount: 0,
      migrationRequired: true,
    });
  }

  return NextResponse.json({
    vapidPublicConfigured: Boolean(getVapidPublicKey()),
    vapidPrivateConfigured: isVapidPrivateKeyConfigured(),
    serviceRoleConfigured: hasServiceRoleClient(),
    serverReady: isPushServerConfigured(),
    subscriptionCount: count ?? 0,
    migrationRequired: false,
  });
}
