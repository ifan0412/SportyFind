import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAllPushSubscriptionsForUser } from "@/lib/push/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.all === true) {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
    await deleteAllPushSubscriptionsForUser(user.id);
    return NextResponse.json({ ok: true });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Push unsubscribe failed:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
