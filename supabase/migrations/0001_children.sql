create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text not null default 'default',
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_date date,
  created_at timestamptz not null default now()
);

create index children_parent_id_idx on public.children (parent_id);

alter table public.children enable row level security;

create policy "parents read own children"
  on public.children for select to authenticated
  using (parent_id = (select auth.uid()));

create policy "parents add own children at zero progress"
  on public.children for insert to authenticated
  with check (parent_id = (select auth.uid()) and xp = 0 and streak_days = 0);

create policy "parents edit own children"
  on public.children for update to authenticated
  using (parent_id = (select auth.uid()))
  with check (parent_id = (select auth.uid()));

create policy "parents remove own children"
  on public.children for delete to authenticated
  using (parent_id = (select auth.uid()));

-- The app may only edit name and avatar. XP, streak and dates change through
-- a server-side function added in the lesson-loop phase.
revoke update on public.children from authenticated;
grant update (display_name, avatar) on public.children to authenticated;
