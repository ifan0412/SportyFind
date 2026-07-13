import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSiteAdmin } from "@/lib/admin";
import { sendAccountReactivationEmail } from "@/lib/account-reactivation-email";
import { getSupabaseAuthCookieOptions } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseAuthCookieOptions(),
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isSiteAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const result = await sendAccountReactivationEmail(email, name);

  if (!result.sent) {
    return NextResponse.json({
      sent: false,
      reason: result.reason,
      message: "帳戶已恢復，但電郵未能發送（已發送站內通知）。",
    });
  }

  return NextResponse.json({ sent: true, message: "恢復通知電郵已發送。" });
}
