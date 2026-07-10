import { NextResponse, type NextRequest } from "next/server";
import {
  createGateCookieValue,
  GATE_COOKIE_NAME,
  getSiteGatePassword,
} from "@/lib/gate";

export async function POST(req: NextRequest) {
  const gatePassword = getSiteGatePassword();
  if (!gatePassword) {
    return NextResponse.json({ error: "Site gate is not enabled" }, { status: 404 });
  }

  const { password } = await req.json();

  if (password !== gatePassword) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(GATE_COOKIE_NAME, createGateCookieValue(gatePassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
