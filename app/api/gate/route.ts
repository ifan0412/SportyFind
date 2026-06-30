import { NextResponse } from 'next/server';

const SITE_PASSWORD = 'sporty123';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password === SITE_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('site_access', SITE_PASSWORD, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
}