-- Paste into Supabase → SQL Editor → Run
-- Deletes the 5 remaining Unsplash seed profiles on /network

delete from public.profiles
where id in (
  '6acfc050-e424-4eda-8684-871241a9a8b1',
  'eded7050-ecae-4f6c-9764-57baa0568c0e',
  '08a1fd9f-612a-4aaf-9756-773f9fa8ef7c',
  '5d739c8d-80d4-4c63-ba4c-c40d7fe6fc40',
  '610c7727-614e-41f4-ada0-1a874b561607'
);

delete from auth.users
where id in (
  '6acfc050-e424-4eda-8684-871241a9a8b1',
  'eded7050-ecae-4f6c-9764-57baa0568c0e',
  '08a1fd9f-612a-4aaf-9756-773f9fa8ef7c',
  '5d739c8d-80d4-4c63-ba4c-c40d7fe6fc40',
  '610c7727-614e-41f4-ada0-1a874b561607'
);
