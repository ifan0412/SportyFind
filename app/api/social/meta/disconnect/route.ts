import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SocialContext, SocialPlatform } from "@/lib/verification";

const PLATFORMS = new Set<SocialPlatform>(["instagram", "facebook", "threads"]);
const CONTEXTS = new Set<SocialContext>(["profile", "physio"]);

export async function POST(request: Request) {
  const body = (await request.json()) as { platform?: SocialPlatform; context?: SocialContext };
  const platform = body.platform;
  const context = body.context ?? "profile";

  if (!platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!CONTEXTS.has(context)) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: deleteError } = await supabase
    .from("profile_social_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform)
    .eq("context", context);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: clearError } = await supabase.rpc("clear_social_connection_url", {
    p_user_id: user.id,
    p_platform: platform,
    p_context: context,
  });

  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
