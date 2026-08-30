-- WMC One Percent Club — initial Supabase schema
create extension if not exists pgcrypto;

create type public.game_phase as enum ('lobby', 'question', 'locked', 'revealed', 'finished');
create type public.answer_kind as enum ('text', 'choice');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  percentage smallint not null check (percentage between 1 and 100),
  question_text text,
  question_image_path text,
  answer_text text not null,
  answer_image_path text,
  answer_kind public.answer_kind not null default 'text',
  choices jsonb not null default '[]'::jsonb,
  accepted_answers text[] not null default '{}',
  enabled boolean not null default true,
  last_used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (question_text is not null or question_image_path is not null)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  pin text not null check (pin ~ '^[0-9]{4}$'),
  host_token uuid not null default gen_random_uuid(),
  phase public.game_phase not null default 'lobby',
  current_round integer not null default 0,
  timer_seconds smallint not null default 30 check (timer_seconds between 5 and 300),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index games_one_active_pin on public.games(pin) where active;

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position integer not null check (position >= 0),
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (game_id, position),
  unique (game_id, question_id)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_token uuid not null default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 24),
  is_alive boolean not null default true,
  pass_available boolean not null default true,
  has_locked_answer boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index players_unique_name_per_game on public.players(game_id, lower(trim(name)));

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  answer text,
  used_pass boolean not null default false,
  is_correct boolean,
  submitted_at timestamptz not null default now(),
  unique (player_id, round_id),
  check ((used_pass and answer is null) or (not used_pass and answer is not null))
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.game_rounds enable row level security;
alter table public.players enable row level security;
alter table public.submissions enable row level security;
alter table public.admins enable row level security;

create policy "public can view active games" on public.games for select to anon, authenticated using (active);
create policy "public can view active players" on public.players for select to anon, authenticated using (exists (select 1 from public.games g where g.id = game_id and g.active));
create policy "public can view active rounds without answers" on public.game_rounds for select to anon, authenticated using (exists (select 1 from public.games g where g.id = game_id and g.active));
create policy "admins manage questions" on public.questions for all to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid())) with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "admins view themselves" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.create_game(p_timer_seconds smallint default 30)
returns table(game_id uuid, game_pin text, host_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  new_pin text;
  new_game public.games;
begin
  loop
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.games where pin = new_pin and active);
  end loop;
  insert into public.games(pin, timer_seconds) values (new_pin, greatest(5, least(p_timer_seconds, 300))) returning * into new_game;
  return query select new_game.id, new_game.pin, new_game.host_token;
end; $$;

create or replace function public.join_game(p_pin text, p_name text)
returns table(player_id uuid, player_token uuid, game_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  selected_game public.games;
  new_player public.players;
begin
  select * into selected_game from public.games where pin = p_pin and active and phase = 'lobby' limit 1;
  if selected_game.id is null then raise exception 'Game not found or already started'; end if;
  insert into public.players(game_id, name) values (selected_game.id, trim(p_name)) returning * into new_player;
  return query select new_player.id, new_player.player_token, new_player.game_id;
exception when unique_violation then
  raise exception 'That name is already in this game';
end; $$;

create or replace function public.submit_answer(p_player_id uuid, p_player_token uuid, p_round_id uuid, p_answer text default null, p_use_pass boolean default false)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  selected_player public.players;
  selected_round public.game_rounds;
  selected_game public.games;
  question_level smallint;
begin
  select * into selected_player from public.players where id = p_player_id and player_token = p_player_token for update;
  if selected_player.id is null or not selected_player.is_alive then raise exception 'Player is not eligible'; end if;
  select * into selected_round from public.game_rounds where id = p_round_id;
  select * into selected_game from public.games where id = selected_player.game_id and phase = 'question' and active;
  if selected_round.id is null or selected_round.game_id <> selected_game.id or selected_round.position <> selected_game.current_round then raise exception 'Round is not accepting answers'; end if;
  if selected_game.ends_at is null then raise exception 'The host has not started the timer'; end if;
  if now() > selected_game.ends_at then raise exception 'Time has expired'; end if;
  select percentage into question_level from public.questions where id = selected_round.question_id;
  if p_use_pass and (not selected_player.pass_available or question_level = 1) then raise exception 'Pass is not available'; end if;
  insert into public.submissions(game_id, player_id, round_id, answer, used_pass) values (selected_game.id, selected_player.id, selected_round.id, case when p_use_pass then null else trim(p_answer) end, p_use_pass);
  update public.players set has_locked_answer = true, pass_available = case when p_use_pass then false else pass_available end, updated_at = now() where id = selected_player.id;
  return true;
end; $$;

grant execute on function public.create_game(smallint) to anon, authenticated;
grant execute on function public.join_game(text, text) to anon, authenticated;
grant execute on function public.submit_answer(uuid, uuid, uuid, text, boolean) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-media', 'question-media', true, 10485760, array['image/png','image/jpeg','image/webp','video/mp4'])
on conflict (id) do nothing;

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.game_rounds;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger questions_touch before update on public.questions for each row execute function public.touch_updated_at();
create trigger games_touch before update on public.games for each row execute function public.touch_updated_at();
