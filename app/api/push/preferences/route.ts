import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  mergePushPreferences,
  serializePushPreferences,
  type PushPreferences,
} from "@/lib/push/preferences";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_preferences, push_reminder_dismissed_at")
    .eq("id", user.id)
    .maybeSingle();

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    preferences: mergePushPreferences(profile?.push_preferences),
    reminderDismissedAt: profile?.push_reminder_dismissed_at ?? null,
    subscriptionCount: count ?? 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currentRes = await supabase
    .from("profiles")
    .select("push_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = mergePushPreferences(currentRes.data?.push_preferences);
  const next: PushPreferences = structuredClone(current);

  if (typeof body.enabled === "boolean") next.enabled = body.enabled;
  if (body.categories && typeof body.categories === "object") {
    for (const key of Object.keys(next.categories)) {
      const val = (body.categories as Record<string, unknown>)[key];
      if (typeof val === "boolean") {
        next.categories[key as keyof typeof next.categories] = val;
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ push_preferences: serializePushPreferences(next) })
    .eq("id", user.id);

  if (error) {
    console.error("Push preferences update failed:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preferences: next });
}
