import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ push_reminder_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Dismiss reminder failed:", error);
    return NextResponse.json({ error: "Failed to save preference" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ push_reminder_dismissed_at: null })
    .eq("id", user.id);

  if (error) {
    console.error("Reset reminder failed:", error);
    return NextResponse.json({ error: "Failed to reset preference" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
