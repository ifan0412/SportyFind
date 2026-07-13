import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAuthCookieOptions, getSupabaseEnv } from '@/lib/supabase/env';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();
  return createServerClient(url, anonKey, {
      cookieOptions: getSupabaseAuthCookieOptions(),
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}