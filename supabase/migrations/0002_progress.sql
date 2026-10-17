create table public.unit_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  unit_id text not null,
  best_correct integer not null default 0 check (best_correct >= 0),
  total integer not null check (total > 0),
  runs integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, unit_id)
);

alter table public.unit_progress enable row level security;

-- Parents can read their children's progress. Nobody writes it directly:
-- only the complete_unit function below does.
create policy "parents read own children's progress"
  on public.unit_progress for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = unit_progress.child_id and c.parent_id = (select auth.uid())
  ));

create table public.attempts (
  id bigint generated always as identity primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  unit_id text not null,
  item text not null,
  heard text not null default '',
  kind text not null check (kind in ('correct', 'almost', 'incorrect')),
  created_at timestamptz not null default now()
);

create index attempts_child_idx on public.attempts (child_id, created_at desc);

alter table public.attempts enable row level security;

create policy "parents read own children's attempts"
  on public.attempts for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = attempts.child_id and c.parent_id = (select auth.uid())
  ));

create policy "parents add attempts for own children"
  on public.attempts for insert to authenticated
  with check (exists (
    select 1 from public.children c
    where c.id = attempts.child_id and c.parent_id = (select auth.uid())
  ));

create or replace function public.complete_unit(
  p_child_id uuid,
  p_unit_id text,
  p_correct integer,
  p_total integer
)
returns table (new_xp integer, new_streak integer, gained integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_last date;
  v_streak integer;
  v_gain integer;
begin
  if p_total <= 0 or p_correct < 0 or p_correct > p_total then
    raise exception 'invalid score';
  end if;

  select c.last_active_date, c.streak_days
    into v_last, v_streak
  from public.children c
  where c.id = p_child_id and c.parent_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'child not found';
  end if;

  v_gain := p_correct * 10;

  if v_last = v_today then
    null;                              -- already active today: streak unchanged
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;          -- active yesterday: streak grows
  else
    v_streak := 1;                     -- first time, or a gap: start again
  end if;

  update public.children
     set xp = xp + v_gain,
         streak_days = v_streak,
         last_active_date = v_today
   where id = p_child_id;

  insert into public.unit_progress (child_id, unit_id, best_correct, total, runs, completed_at, updated_at)
  values (p_child_id, p_unit_id, p_correct, p_total, 1, now(), now())
  on conflict (child_id, unit_id) do update
    set best_correct = greatest(public.unit_progress.best_correct, excluded.best_correct),
        total = excluded.total,
        runs = public.unit_progress.runs + 1,
        completed_at = now(),
        updated_at = now();

  return query
    select c.xp, c.streak_days, v_gain
    from public.children c
    where c.id = p_child_id;
end;
$$;

revoke all on function public.complete_unit(uuid, text, integer, integer) from public;
grant execute on function public.complete_unit(uuid, text, integer, integer) to authenticated;
