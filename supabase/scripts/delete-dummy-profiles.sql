-- One-time: remove 10 seeded dummy network profiles (safe to run in Supabase SQL Editor)
-- Keeps real accounts: Ran Takahashi, Erling Haaland, Marco Ng, Martin Zubimendi, (Test) Stephanie

delete from auth.users
where id in (
  '6acfc050-e424-4eda-8684-871241a9a8b1',
  'eded7050-ecae-4f6c-9764-57baa0568c0e',
  '08a1fd9f-612a-4aaf-9756-773f9fa8ef7c',
  '5d739c8d-80d4-4c63-ba4c-c40d7fe6fc40',
  '610c7727-614e-41f4-ada0-1a874b561607',
  '22222222-2222-4222-a222-222222222222',
  '33333333-3333-4333-a333-333333333333',
  '44444444-4444-4444-a444-444444444444',
  '55555555-5555-4555-a555-555555555555',
  '11111111-1111-4111-a111-111111111111'
);

-- Orphan profiles (seeded without auth.users)
delete from public.profiles
where id in (
  '22222222-2222-4222-a222-222222222222',
  '33333333-3333-4333-a333-333333333333',
  '44444444-4444-4444-a444-444444444444',
  '55555555-5555-4555-a555-555555555555',
  '11111111-1111-4111-a111-111111111111'
);
