/**
 * One-time cleanup: remove seeded dummy network profiles.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API).
 *
 * Usage: node scripts/delete-dummy-profiles.mjs
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DUMMY_PROFILES = [
  { id: "6acfc050-e424-4eda-8684-871241a9a8b1", name: "李慧詩 Sarah" },
  { id: "eded7050-ecae-4f6c-9764-57baa0568c0e", name: "張宇 Marco" },
  { id: "08a1fd9f-612a-4aaf-9756-773f9fa8ef7c", name: "王大衛 David" },
  { id: "5d739c8d-80d4-4c63-ba4c-c40d7fe6fc40", name: "林嘉欣 Kayan" },
  { id: "610c7727-614e-41f4-ada0-1a874b561607", name: "林哲宇 Alex" },
  { id: "22222222-2222-4222-a222-222222222222", name: "楊文蔚 Cecilia (Mock)" },
  { id: "33333333-3333-4333-a333-333333333333", name: "張潤衡 Marcus" },
  { id: "44444444-4444-4444-a444-444444444444", name: "歐鎧淳 Stephanie (Mock)" },
  { id: "55555555-5555-4555-a555-555555555555", name: "黃澤林 Coleman (Mock)" },
  { id: "11111111-1111-4111-a111-111111111111", name: "陳家豪 Ka-Ho" },
];

function loadEnv() {
  const env = {};
  if (!fs.existsSync(".env.local")) return env;
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const profile of DUMMY_PROFILES) {
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    const { error: profileError } = await admin.from("profiles").delete().eq("id", profile.id);
    if (profileError) {
      console.error(`FAIL ${profile.name} (${profile.id}): ${error.message} | profile: ${profileError.message}`);
    } else {
      console.log(`OK   ${profile.name} — removed orphan profile`);
    }
  } else {
    console.log(`OK   ${profile.name} — deleted auth user`);
  }
}

const { data: remaining, error: listError } = await admin
  .from("profiles")
  .select("id, full_name, handle")
  .order("created_at", { ascending: true });

if (listError) {
  console.error("Could not list remaining profiles:", listError.message);
  process.exit(1);
}

console.log(`\nRemaining profiles (${remaining.length}):`);
for (const p of remaining) {
  console.log(` - ${p.full_name || "(no name)"} ${p.handle ? `@${p.handle}` : ""} [${p.id}]`);
}
