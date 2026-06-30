import { NextResponse, type NextRequest } from 'next/server';

const GATE_PASSWORD = "sporty2026";
const GATE_COOKIE = "site_access";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== GATE_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(GATE_COOKIE, GATE_PASSWORD, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}