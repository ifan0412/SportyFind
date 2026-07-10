import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  GATE_COOKIE_NAME,
  getSiteGatePassword,
  isSiteGateEnabled,
  verifyGateCookie,
} from "@/lib/gate";
import { isSiteAdmin } from "@/lib/admin";

function isGateExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/gate") ||
    pathname.startsWith("/api/gate") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const pathname = req.nextUrl.pathname;

  const gatePassword = getSiteGatePassword();
  if (isSiteGateEnabled() && gatePassword && !isGateExemptPath(pathname)) {
    const gateCookie = req.cookies.get(GATE_COOKIE_NAME)?.value;
    if (!verifyGateCookie(gateCookie, gatePassword)) {
      const gateUrl = new URL("/gate", req.url);
      gateUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(gateUrl);
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    // Transient network errors during login should not hard-fail navigation.
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth", req.url));
    }
    if (!isSiteAdmin(user.email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_suspended, suspended_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        const authUrl = new URL("/auth", req.url);
        authUrl.searchParams.set("suspended", "1");
        if (profile.suspended_reason) {
          authUrl.searchParams.set("reason", profile.suspended_reason);
        }
        return NextResponse.redirect(authUrl);
      }
    } catch {
      // Do not block navigation on profile lookup failures.
    }
  }

  if (pathname.startsWith("/profile") && !user) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!auth/callback|_next/static|_next/image|favicon.ico).*)",
  ],
};
