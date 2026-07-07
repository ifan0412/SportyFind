-- Allow participants to read, update, and delete friendships in any status (incl. rejected)
-- so users can re-send requests after rejection.

alter table if exists public.friendships enable row level security;

drop policy if exists "Users can read their friendships" on public.friendships;
drop policy if exists "Users can insert friend requests" on public.friendships;
drop policy if exists "Users can update their friendships" on public.friendships;
drop policy if exists "Users can delete their friendships" on public.friendships;
drop policy if exists "Participants can read friendships" on public.friendships;
drop policy if exists "Users can send friend requests" on public.friendships;
drop policy if exists "Participants can update friendships" on public.friendships;
drop policy if exists "Participants can delete friendships" on public.friendships;

create policy "Participants can read friendships"
  on public.friendships for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = sender_id);

create policy "Participants can update friendships"
  on public.friendships for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Participants can delete friendships"
  on public.friendships for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
