-- =============================================================================
-- SportyFind demo profile seed: fankaiyan@yahoo.com.hk
-- =============================================================================
--
-- PURPOSE
--   Populate a triple-role (athlete + coach + physio) showcase account with
--   realistic Hong Kong sports content for platform demonstrations.
--
-- PREREQUISITES
--   1. Run in Supabase SQL Editor with the **service role** (bypasses RLS).
--   2. The account fankaiyan@yahoo.com.hk must already exist in auth.users
--      (sign up once via /auth, then run this script).
--   3. All migrations through 029 should be applied.
--
-- RE-RUNNABLE
--   Cleans prior demo-owned rows for this user (and demo peer accounts) before
--   re-inserting. Safe to run multiple times.
--
-- MANUAL STEP AFTER SQL
--   Upload highlight photos via Profile → 賽場圖庫 (stored in `highlights`
--   bucket; not representable in SQL). Avatar/cover URLs below use placeholders.
--
-- DEMO PEER LOGIN (optional, for inbox / friend-request demos)
--   demo.peer1@sportyfind.hk  / DemoPeer1!
--   demo.peer2@sportyfind.hk  / DemoPeer2!
--   demo.peer3@sportyfind.hk  / DemoPeer3!
--   demo.peer4@sportyfind.hk  / DemoPeer4!
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: create a minimal auth user + profile (for demo peers)
-- ---------------------------------------------------------------------------
create or replace function public._demo_ensure_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_meta jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_instance uuid;
begin
  select id into v_instance from auth.instances limit 1;
  if v_instance is null then
    v_instance := '00000000-0000-0000-0000-000000000000';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, recovery_sent_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_instance, p_id, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    p_meta,
    now(), now()
  )
  on conflict (id) do update set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    p_id,
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  insert into public.profiles (id)
  values (p_id)
  on conflict (id) do nothing;

  return p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Main seed
-- ---------------------------------------------------------------------------
do $$
declare
  v_demo_email constant text := 'fankaiyan@yahoo.com.hk';
  v_demo_id uuid;

  -- Fixed demo peer UUIDs (reproducible across runs)
  v_peer1 constant uuid := 'a0000001-0000-4000-8000-000000000001';
  v_peer2 constant uuid := 'a0000002-0000-4000-8000-000000000002';
  v_peer3 constant uuid := 'a0000003-0000-4000-8000-000000000003';
  v_peer4 constant uuid := 'a0000004-0000-4000-8000-000000000004';

  v_sport_volleyball uuid;
  v_sport_basketball uuid;
  v_sport_tennis uuid;

  v_team_id uuid := 'b0000001-0000-4000-8000-000000000001';
  v_coach_svc1 uuid := 'c0000001-0000-4000-8000-000000000001';
  v_coach_svc2 uuid := 'c0000002-0000-4000-8000-000000000002';
  v_physio_svc1 uuid := 'd0000001-0000-4000-8000-000000000001';
  v_physio_svc2 uuid := 'd0000002-0000-4000-8000-000000000002';
  v_event_hosted uuid := 'e0000001-0000-4000-8000-000000000001';
  v_event_joined1 uuid := 'e0000002-0000-4000-8000-000000000002';
  v_event_joined2 uuid := 'e0000003-0000-4000-8000-000000000003';
  v_friendship_pending uuid := 'f0000001-0000-4000-8000-000000000001';
  v_friendship_accepted1 uuid := 'f0000002-0000-4000-8000-000000000002';
  v_friendship_accepted2 uuid := 'f0000003-0000-4000-8000-000000000003';
begin
  -- Resolve main demo user
  select id into v_demo_id from auth.users where lower(email) = lower(v_demo_email) limit 1;
  if v_demo_id is null then
    raise exception 'User % not found. Please sign up first, then re-run this script.', v_demo_email;
  end if;

  -- Ensure profile row exists (trigger may have created it)
  insert into public.profiles (id) values (v_demo_id) on conflict (id) do nothing;

  -- Demo peer accounts (friends, reviewers, enquiry senders)
  perform public._demo_ensure_auth_user(v_peer1, 'demo.peer1@sportyfind.hk', 'DemoPeer1!',
    '{"first_name":"志明","last_name":"陳","full_name":"陳志明","handle":"demo_ming","is_player":true,"is_coach":false,"is_physio":false,"roles_confirmed":true,"gender":"male"}'::jsonb);
  perform public._demo_ensure_auth_user(v_peer2, 'demo.peer2@sportyfind.hk', 'DemoPeer2!',
    '{"first_name":"美玲","last_name":"李","full_name":"李美玲","handle":"demo_ling","is_player":true,"is_coach":false,"is_physio":false,"roles_confirmed":true,"gender":"female"}'::jsonb);
  perform public._demo_ensure_auth_user(v_peer3, 'demo.peer3@sportyfind.hk', 'DemoPeer3!',
    '{"first_name":"家豪","last_name":"黃","full_name":"黃家豪","handle":"demo_ho","is_player":true,"is_coach":false,"is_physio":false,"roles_confirmed":true,"gender":"male"}'::jsonb);
  perform public._demo_ensure_auth_user(v_peer4, 'demo.peer4@sportyfind.hk', 'DemoPeer4!',
    '{"first_name":"穎怡","last_name":"張","full_name":"張穎怡","handle":"demo_ying","is_player":true,"is_coach":false,"is_physio":false,"roles_confirmed":true,"gender":"female"}'::jsonb);

  update public.profiles set
    first_name = '志明', last_name = '陳', full_name = '陳志明', handle = 'demo_ming',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_ming',
    headline = '業餘排球愛好者', bio = '週末固定約波，歡迎約戰！', gender = 'male', is_player = true, roles_confirmed = true
  where id = v_peer1;

  update public.profiles set
    first_name = '美玲', last_name = '李', full_name = '李美玲', handle = 'demo_ling',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_ling',
    headline = '羽毛球中階選手', bio = '混雙為主，週三晚上有空。', gender = 'female', is_player = true, roles_confirmed = true
  where id = v_peer2;

  update public.profiles set
    first_name = '家豪', last_name = '黃', full_name = '黃家豪', handle = 'demo_ho',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_ho',
    headline = '籃球 3v3 愛好者', bio = '尖沙咀固定場，歡迎組隊。', gender = 'male', is_player = true, roles_confirmed = true
  where id = v_peer3;

  update public.profiles set
    first_name = '穎怡', last_name = '張', full_name = '張穎怡', handle = 'demo_ying',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_ying',
    headline = '網球 NTRP 3.5', bio = '週末約球，歡迎交流。', gender = 'female', is_player = true, roles_confirmed = true
  where id = v_peer4;

  -- Resolve sport IDs (supports both slug and legacy capitalized names)
  select id into v_sport_volleyball from public.sports where lower(name) in ('volleyball', '排球') limit 1;
  select id into v_sport_basketball from public.sports where lower(name) in ('basketball', '籃球') limit 1;
  select id into v_sport_tennis from public.sports where lower(name) in ('tennis', '網球') limit 1;

  if v_sport_volleyball is null or v_sport_basketball is null or v_sport_tennis is null then
    raise exception 'Sports master list incomplete. Run migration 011_sport_categories.sql first.';
  end if;

  -- -------------------------------------------------------------------------
  -- Cleanup prior demo data (idempotent re-run)
  -- -------------------------------------------------------------------------
  delete from public.notifications where user_id = v_demo_id
    or sender_id in (v_peer1, v_peer2, v_peer3, v_peer4);
  delete from public.messages where sender_id = v_demo_id or receiver_id = v_demo_id
    or sender_id in (v_peer1, v_peer2, v_peer3, v_peer4)
    or receiver_id in (v_peer1, v_peer2, v_peer3, v_peer4);
  delete from public.friendships where sender_id = v_demo_id or receiver_id = v_demo_id
    or sender_id in (v_peer1, v_peer2, v_peer3, v_peer4)
    or receiver_id in (v_peer1, v_peer2, v_peer3, v_peer4);
  delete from public.event_registrations where user_id = v_demo_id or event_id in (v_event_hosted, v_event_joined1, v_event_joined2);
  delete from public.events where id in (v_event_hosted, v_event_joined1, v_event_joined2) or creator_id = v_demo_id;
  delete from public.team_achievements where team_id = v_team_id;
  delete from public.team_members where team_id = v_team_id or user_id = v_demo_id;
  delete from public.teams where id = v_team_id or created_by = v_demo_id;
  delete from public.coach_enquiries where coach_id = v_demo_id;
  delete from public.coach_reviews where coach_id = v_demo_id;
  delete from public.coach_services where coach_id = v_demo_id or id in (v_coach_svc1, v_coach_svc2);
  delete from public.physio_enquiries where physio_id = v_demo_id;
  delete from public.physio_reviews where physio_id = v_demo_id;
  delete from public.physio_services where physio_id = v_demo_id or id in (v_physio_svc1, v_physio_svc2);
  delete from public.user_sports where user_id = v_demo_id;

  -- -------------------------------------------------------------------------
  -- 1. Core profile (triple role: athlete + coach + physio)
  -- -------------------------------------------------------------------------
  update public.profiles set
    first_name = '凱欣',
    last_name = '范',
    full_name = '范凱欣',
    handle = 'fankaiyan',
    headline = '排球主攻手 · 認證教練 · 運動物理治療師',
    bio = '前學界代表隊主攻手，現專注私人特訓、運動復健與業餘聯賽。歡迎約戰、約課、約診！',
    athlete_bio = '<p>香港土生土長的<strong>排球主攻手</strong>，曾代表學界出戰全港學界錦標賽。</p><ul><li>最高扣球打點 318 cm</li><li>擅長後排攻擊與發球攔網戰術</li><li>週末活躍於沙田及大埔區業餘聯賽</li></ul><p>目前狀態：<em>開放約戰</em>，亦接受隊伍試訓邀請。</p>',
    coach_bio = '<p>持有<strong>排球教練證</strong>及<strong>體適能教練證</strong>，8 年私人執教經驗。</p><p>專長：扣球發力鏈、攔網腳步、青少年基礎技術。曾帶領校隊奪得學界八強。</p>',
    gender = 'female',
    is_player = true,
    is_coach = true,
    is_physio = true,
    roles_confirmed = true,
    status_tag = 'open_to_match',
    display_sports = array['volleyball', 'basketball', 'tennis'],
    country = 'Hong Kong',
    region = '沙田、大埔',
    location = '沙田、大埔, Hong Kong',
    districts = array['sha-tin', 'tai-po'],
    subdistricts = array['sha-tin-town', 'tai-wai', 'tai-po-market'],
    height_cm = 178,
    weight_kg = 68,
    show_physical_stats = true,
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=fankaiyan',
    contact_email = 'fankaiyan@yahoo.com.hk',
    contact_phone = '+852 9123 4567',
    player_whatsapp = '+852 9123 4567',
    player_phone_friends_only = true,
    player_whatsapp_friends_only = true,
    player_email_friends_only = false,
    address = '沙田運動場旁',
    city_region = '沙田',
    is_address_public = false,
    instagram_url = 'https://instagram.com/fankaiyan_sports',
    facebook_url = 'https://facebook.com/fankaiyan.sports',
    threads_url = 'https://threads.net/@fankaiyan_sports',
    -- Coach fields
    coach_districts = array['sha-tin', 'kwun-tong', 'kowloon-city'],
    coach_subdistricts = array['sha-tin-town', 'tai-wai', 'kwun-tong'],
    coach_teaching_experience_years = 8,
    coach_service_centre = '沙田運動場 · 觀塘體育館',
    coach_qualification_tags = array['排球教練證', '體適能教練證 (AASFP / NASM)', 'CPR / 急救證書'],
    coach_qualification_custom = '香港排球總會 Level 2 教練（進修中）',
    -- Physio fields
    physio_status = 'available',
    clinic_name = '范凱欣運動復健中心',
    physio_rate = 800,
    physio_country = 'Hong Kong',
    physio_region = '沙田、觀塘',
    physio_experience_years = '6',
    physio_qualifications = '<p>註冊物理治療師，專注<strong>運動傷患評估</strong>與<strong>術後復康</strong>。</p><p>常見個案：肩袖損傷、前十字韌帶術後、排球肩與扣球肘。</p>',
    physio_service_tags = array['運動復健', '傷患評估', '手法治療', '術後復康'],
    physio_qualification_tags = array['註冊物理治療師 (HK)', '運動物理治療師', 'Dry Needling 證書', 'CPR / 急救證書'],
    physio_qualification_custom = '香港理工大學物理治療學士',
    physio_districts = array['sha-tin', 'kwun-tong'],
    physio_subdistricts = array['sha-tin-town', 'kwun-tong'],
    physio_contact_email = 'physio@fankaiyan.hk',
    physio_contact_phone = '+852 9876 5432',
    physio_city_region = '沙田、觀塘',
    physio_address = '沙田連城廣場 12 樓',
    physio_is_address_public = true,
    physio_instagram_url = 'https://instagram.com/fankaiyan_physio',
    physio_facebook_url = 'https://facebook.com/fankaiyan.physio',
    physio_threads_url = 'https://threads.net/@fankaiyan_physio'
  where id = v_demo_id;

  -- -------------------------------------------------------------------------
  -- 2. Sport expertise (技術特長) with rich metadata
  -- -------------------------------------------------------------------------
  insert into public.user_sports (id, user_id, sport_id, metadata, sort_order) values
  (
    gen_random_uuid(), v_demo_id, v_sport_volleyball,
    '{
      "experience_years": "5 - 9 年 (5 - 9 years)",
      "positions": ["主攻手 (OH - Outside Hitter)", "副攻手 (OPP - Opposite)"],
      "spike_reach": "318",
      "block_reach": "300",
      "dominant_hand": "右手 (Right)"
    }'::jsonb,
    1
  ),
  (
    gen_random_uuid(), v_demo_id, v_sport_basketball,
    '{
      "experience_years": "2 - 4 年 (2 - 4 years)",
      "positions": ["SF 小前鋒", "SG 得分後衛"],
      "playstyle": "3&D 3分防守鎖",
      "wingspan_cm": "188"
    }'::jsonb,
    2
  ),
  (
    gen_random_uuid(), v_demo_id, v_sport_tennis,
    '{
      "experience_years": "2 - 4 年 (2 - 4 years)",
      "ntrp_level": "4.0 (具備旋轉與配球落點)",
      "backhand_type": "右手 / 雙手反拍 (Right 2H)",
      "playstyle": "底線攻擊型 (Aggressive Baseliner)"
    }'::jsonb,
    3
  );

  -- -------------------------------------------------------------------------
  -- 3. Coach services (2 published + pricing modes)
  -- -------------------------------------------------------------------------
  insert into public.coach_services (
    id, coach_id, title, sport_category, hourly_rate, pricing_mode,
    districts, subdistricts, description, photos, is_active,
    teaching_experience_years, sort_order
  ) values
  (
    v_coach_svc1, v_demo_id,
    '私人排球扣球 & 發球特訓',
    'volleyball', 650, 'session',
    array['sha-tin', 'tai-po'], array['sha-tin-town', 'tai-wai'],
    '一對一或雙人小組，專注扣球發力鏈、助跑節奏與攔網判斷。含影片回放分析。',
    array['https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800'],
    true, 8, 1
  ),
  (
    v_coach_svc2, v_demo_id,
    '青少年排球基礎班（每週團體）',
    'volleyball', 280, 'hourly',
    array['kwun-tong'], array['kwun-tong'],
    '適合 12–16 歲學員，基礎傳墊扣發與戰術意識。每班 6–8 人。',
    array['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'],
    true, 5, 2
  );

  insert into public.coach_reviews (service_id, coach_id, student_id, rating, comment) values
  (v_coach_svc1, v_demo_id, v_peer1, 5, '扣球點明顯提升，教練很會拆解動作！'),
  (v_coach_svc1, v_demo_id, v_peer3, 5, '發球穩定了很多，推薦給想進步的朋友。'),
  (v_coach_svc2, v_demo_id, v_peer2, 4, '女兒很喜歡上課，氣氛好又專業。');

  insert into public.coach_enquiries (service_id, coach_id, student_id, message, status) values
  (v_coach_svc1, v_demo_id, v_peer4, '想約下週六下午扣球特訓，請問有空嗎？', 'pending'),
  (v_coach_svc2, v_demo_id, v_peer1, '兒子 13 歲，想報名基礎班。', 'seen');

  -- -------------------------------------------------------------------------
  -- 4. Physio services
  -- -------------------------------------------------------------------------
  insert into public.physio_services (
    id, physio_id, title, service_type, service_types, sport_category,
    session_rate, pricing_mode, districts, subdistricts,
    service_centre, full_address, description, photos, is_active, sort_order
  ) values
  (
    v_physio_svc1, v_demo_id,
    '運動傷患評估 + 復健計劃',
    '運動復健',
    array['運動復健', '傷患評估'],
    'volleyball',
    800, 'session',
    array['sha-tin'], array['sha-tin-town'],
    '范凱欣運動復健中心',
    '新界沙田連城廣場 12 樓',
    '初診 60 分鐘：評估、手法治療及居家運動處方。適合肩、膝、踝運動傷患。',
    array['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'],
    true, 1
  ),
  (
    v_physio_svc2, v_demo_id,
    '排球肩 / 扣球肘專項治療',
    '痛症管理',
    array['痛症管理', '手法治療'],
    'volleyball',
    700, 'session',
    array['kwun-tong'], array['kwun-tong'],
    '觀塘復康診所（合作）',
    '九龍觀塘成業街 15 號 8 樓',
    '針對排球員常見上肢過勞，結合手法、肌內效貼紮及漸進式負重訓練。',
    array['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800'],
    true, 2
  );

  insert into public.physio_reviews (service_id, physio_id, patient_id, rating, comment) values
  (v_physio_svc1, v_demo_id, v_peer2, 5, '肩袖痛改善好多，回家運動很清楚。'),
  (v_physio_svc2, v_demo_id, v_peer3, 5, '扣球肘再發的頻率明顯下降，非常感謝！');

  insert into public.physio_enquiries (service_id, physio_id, patient_id, message, status) values
  (v_physio_svc1, v_demo_id, v_peer1, '打排球扭傷腳踝，想約評估。', 'pending');

  -- -------------------------------------------------------------------------
  -- 5. Team (admin role + achievements + gallery)
  -- -------------------------------------------------------------------------
  insert into public.teams (
    id, name_en, name_zh, sport_category, recruitment_status, gender_requirement,
    created_by, est_year, location_region, logo_url, cover_url, bio,
    gallery_photos, social_links, sport_metadata
  ) values (
    v_team_id,
    'Sha Tin Spikers',
    '沙田飛躍排球會',
    'volleyball',
    'open',
    'both',
    v_demo_id,
    2018,
    '沙田、大埔',
    'https://api.dicebear.com/7.x/initials/svg?seed=STS',
    'https://images.unsplash.com/photo-1592656102681-007a746bf6ca?w=1200',
    '沙田區業餘排球會，每週固定練習及約戰。歡迎有一定基礎的球員加入！',
    '[
      {"url":"https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600","caption":"2024 聯賽冠軍"},
      {"url":"https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600","caption":"隊內練習"}
    ]'::jsonb,
    '{"ig":"https://instagram.com/shatin_spikers","fb":"https://facebook.com/shatinspikers","phone":"+852 9123 4567"}'::jsonb,
    '{
      "team_gender": "mixed",
      "home_court": "沙田運動場",
      "league_name": "沙田區業餘排球聯賽",
      "division_level": "甲組",
      "team_colors": "藍白",
      "location_regions": ["sha-tin", "tai-po"],
      "training_frequency": "每週二、四晚上"
    }'::jsonb
  );

  insert into public.team_members (team_id, user_id, role) values
  (v_team_id, v_demo_id, 'admin'),
  (v_team_id, v_peer1, 'captain'),
  (v_team_id, v_peer2, 'player'),
  (v_team_id, v_peer3, 'player');

  insert into public.team_achievements (team_id, year, title, description) values
  (v_team_id, 2024, '沙田區業餘聯賽冠軍', '決賽 3:1 擊敗大埔飛鷹'),
  (v_team_id, 2023, '全港業餘排球邀請賽八強', '隊史最佳成績');

  -- -------------------------------------------------------------------------
  -- 6. Events (1 hosted + 2 joined)
  -- -------------------------------------------------------------------------
  insert into public.events (
    id, creator_id, organizer_team_id, title, description, sport_category,
    event_type, registration_type, location_name, location_address,
    districts, subdistricts, start_time, end_time,
    max_capacity, fee, late_cancellation_hours, approval_mode,
    gender_requirement, status
  ) values
  (
    v_event_hosted, v_demo_id, v_team_id,
    '沙田週末排球友誼賽 3v3',
    '歡迎業餘球隊報名，採循環賽制。提供飲水及急救包。',
    'volleyball', 'friendly', 'individual',
    '沙田運動場', '新界沙田大涌橋路 1 號',
    array['sha-tin'], array['sha-tin-town'],
    now() + interval '14 days',
    now() + interval '14 days' + interval '4 hours',
    24, 50, 24, 'fcfs', 'both', 'published'
  ),
  (
    v_event_joined1, v_peer1, null,
    '銅鑼灣羽毛球双打交流賽',
    '中階以上，自備球拍。',
    'badminton', 'friendly', 'individual',
    '銅鑼灣體育館', '香港銅鑼灣高士威道 66 號',
    array['wan-chai'], array['causeway-bay'],
    now() + interval '7 days',
    now() + interval '7 days' + interval '3 hours',
    16, 0, 24, 'fcfs', 'both', 'published'
  ),
  (
    v_event_joined2, v_peer3, null,
    '觀塘籃球 3v3 夜賽',
    '每隊 3–4 人，先報先得。',
    'basketball', 'tournament', 'individual',
    '觀塘體育館', '九龍觀塘翠屏道 2 號',
    array['kwun-tong'], array['kwun-tong'],
    now() + interval '10 days',
    now() + interval '10 days' + interval '3 hours',
    12, 30, 12, 'approval', 'both', 'published'
  );

  insert into public.event_registrations (event_id, user_id, status, companion_count, alias, note) values
  (v_event_hosted, v_demo_id, 'going', 0, null, '主辦人'),
  (v_event_hosted, v_peer1, 'going', 0, null, null),
  (v_event_hosted, v_peer2, 'going', 1, '朋友', '帶一位朋友'),
  (v_event_joined1, v_demo_id, 'going', 0, null, '想打混雙'),
  (v_event_joined2, v_demo_id, 'pending', 0, null, '等審核');

  -- -------------------------------------------------------------------------
  -- 7. Friendships (accepted + 1 inbound pending)
  -- -------------------------------------------------------------------------
  insert into public.friendships (id, sender_id, receiver_id, status) values
  (v_friendship_accepted1, v_demo_id, v_peer1, 'accepted'),
  (v_friendship_accepted2, v_peer2, v_demo_id, 'accepted'),
  (gen_random_uuid(), v_peer3, v_demo_id, 'accepted'),
  (v_friendship_pending, v_peer4, v_demo_id, 'pending');

  -- -------------------------------------------------------------------------
  -- 8. Direct messages (inbox demo)
  -- -------------------------------------------------------------------------
  insert into public.messages (sender_id, receiver_id, content, is_read) values
  (v_peer1, v_demo_id, '凱欣，下週六友誼賽你會來嗎？我們隊還缺一人。', true),
  (v_demo_id, v_peer1, '會啊！我負責主攻，到時見～', true),
  (v_peer2, v_demo_id, '想約你的扣球特訓，請問週日下午有空嗎？', false),
  (v_demo_id, v_peer3, '觀塘夜賽我報名了，麻煩幫忙審核一下 🙏', true);

  -- -------------------------------------------------------------------------
  -- 9. Notifications (bell icon demo — mix of types)
  -- -------------------------------------------------------------------------
  insert into public.notifications (user_id, sender_id, type, is_read, friendship_id, team_id, event_id) values
  (v_demo_id, v_peer4, 'friend_request', false, v_friendship_pending, null, null),
  (v_demo_id, v_peer1, 'friend_accepted', true, v_friendship_accepted1, null, null),
  (v_demo_id, v_peer2, 'coach_enquiry', false, null, null, null),
  (v_demo_id, v_peer1, 'physio_enquiry', false, null, null, null),
  (v_demo_id, v_peer1, 'event_registration', true, null, null, v_event_hosted),
  (v_demo_id, v_peer3, 'event_joined', false, null, null, v_event_joined2),
  (v_demo_id, v_peer2, 'coach_review', true, null, null, null),
  (v_demo_id, v_peer2, 'physio_review', true, null, null, null),
  (v_demo_id, v_peer3, 'team_join_request', false, null, v_team_id, null);

  raise notice '✅ Demo profile seeded for % (id: %)', v_demo_email, v_demo_id;
  raise notice '   Public card: /p/%', v_demo_id;
  raise notice '   Team admin:  /team/%/admin', v_team_id;
end;
$$;

-- Optional: drop helper (keep if you plan to re-seed often)
-- drop function if exists public._demo_ensure_auth_user(uuid, text, text, jsonb);
