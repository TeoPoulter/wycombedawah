-- WMC One Percent Club — reliable live clock, mid-game joining and clean leaving.
-- Safe to run after 20260830_v1_completion.sql.

alter table public.players
  add column if not exists connected boolean not null default true,
  add column if not exists eligible_from_round integer not null default 0;

alter table public.games
  add column if not exists reveal_at timestamptz;

drop index if exists public.players_unique_name_per_game;
create unique index players_unique_name_per_game
  on public.players(game_id, lower(trim(name)))
  where connected;

create index if not exists players_connected_game_joined
  on public.players(game_id, joined_at)
  where connected;

-- The app reads sanitized, credential-checked RPC snapshots. Direct row reads would
-- expose host/player tokens because RLS cannot hide individual columns.
drop policy if exists "public can view active games" on public.games;
drop policy if exists "public can view active players" on public.players;
drop policy if exists "public can view active rounds without answers" on public.game_rounds;

create or replace function public.host_start_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token and active and phase = 'lobby'
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid or the game has already started'; end if;
  if not exists (select 1 from public.players where game_id = p_game_id and connected) then
    raise exception 'At least one player is required';
  end if;

  delete from public.game_rounds where game_id = p_game_id;
  insert into public.game_rounds(game_id, question_id, position)
  select p_game_id, id, row_number() over(order by percentage desc) - 1
  from (
    select distinct on (percentage) id, percentage
    from public.questions
    where enabled
    order by percentage, last_used_at nulls first, random()
  ) chosen;
  if not exists (select 1 from public.game_rounds where game_id = p_game_id) then
    raise exception 'No enabled questions are available';
  end if;

  update public.questions set last_used_at = now()
  where id in (select question_id from public.game_rounds where game_id = p_game_id);
  update public.players
  set eligible_from_round = 0, has_locked_answer = false
  where game_id = p_game_id and connected;
  update public.games
  set phase = 'question', current_round = 0, ends_at = null, reveal_at = null
  where id = p_game_id;
  return true;
end; $$;

create or replace function public.join_game(p_pin text, p_name text)
returns table(player_id uuid, player_token uuid, game_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  selected_game public.games;
  new_player public.players;
  first_round integer;
begin
  select * into selected_game
  from public.games
  where pin = p_pin and active and phase <> 'finished'
  order by created_at desc
  limit 1
  for update;
  if selected_game.id is null then raise exception 'Game not found'; end if;

  first_round := case
    when selected_game.phase = 'lobby' then 0
    when selected_game.phase = 'question' and selected_game.ends_at is null then selected_game.current_round
    else selected_game.current_round + 1
  end;

  if selected_game.phase <> 'lobby' and not exists (
    select 1 from public.game_rounds round_item
    where round_item.game_id = selected_game.id and round_item.position = first_round
  ) then raise exception 'The game is finishing'; end if;

  insert into public.players(game_id, name, connected, eligible_from_round)
  values (selected_game.id, trim(p_name), true, first_round)
  returning * into new_player;
  return query select new_player.id, new_player.player_token, new_player.game_id;
exception when unique_violation then
  raise exception 'That name is already in this game';
end; $$;

create or replace function public.player_leave_game(p_player_id uuid, p_player_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.players
  set connected = false,
      is_alive = false,
      has_locked_answer = false,
      updated_at = now()
  where id = p_player_id and player_token = p_player_token and connected;
  if found then return true; end if;
  if exists (select 1 from public.players where id = p_player_id and player_token = p_player_token) then
    return true;
  end if;
  raise exception 'Player credentials are invalid';
end; $$;

create or replace function public.submit_answer(
  p_player_id uuid,
  p_player_token uuid,
  p_round_id uuid,
  p_answer text default null,
  p_use_pass boolean default false
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  target_game_id uuid;
  selected_player public.players;
  selected_round public.game_rounds;
  selected_game public.games;
  question_level smallint;
begin
  select game_id into target_game_id from public.players
  where id = p_player_id and player_token = p_player_token and connected;
  if target_game_id is null then raise exception 'Player is not eligible'; end if;

  select * into selected_game from public.games
  where id = target_game_id and phase = 'question' and active for update;
  if selected_game.id is null then raise exception 'Round is not accepting answers'; end if;
  select * into selected_player from public.players
  where id = p_player_id and player_token = p_player_token and connected for update;
  if selected_player.id is null or not selected_player.is_alive then raise exception 'Player is not eligible'; end if;
  select * into selected_round from public.game_rounds where id = p_round_id;

  if selected_round.id is null
    or selected_round.game_id <> selected_game.id
    or selected_round.position <> selected_game.current_round
    or selected_player.eligible_from_round > selected_game.current_round then
    raise exception 'Round is not accepting answers';
  end if;
  if selected_game.ends_at is null then raise exception 'The host has not started the timer'; end if;
  if now() > selected_game.ends_at then raise exception 'Time''s up!'; end if;

  select percentage into question_level from public.questions where id = selected_round.question_id;
  if p_use_pass and (
    not selected_player.pass_available
    or question_level > 60
    or question_level = 1
  ) then raise exception 'Pass is not available'; end if;
  if not p_use_pass and nullif(trim(p_answer), '') is null then raise exception 'An answer is required'; end if;

  insert into public.submissions(game_id, player_id, round_id, answer, used_pass)
  values (
    selected_game.id,
    selected_player.id,
    selected_round.id,
    case when p_use_pass then null else trim(p_answer) end,
    p_use_pass
  );
  update public.players
  set has_locked_answer = true,
      pass_available = case when p_use_pass then false else pass_available end,
      updated_at = now()
  where id = selected_player.id;
  return true;
exception when unique_violation then
  raise exception 'Your answer is already final';
end; $$;

-- Private idempotent scorer used by both the automatic clock and manual fallback.
create or replace function public._score_and_reveal(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  round_record public.game_rounds;
  question_record public.questions;
begin
  select round_item.* into round_record
  from public.game_rounds round_item
  join public.games game on game.id = round_item.game_id and round_item.position = game.current_round
  where game.id = p_game_id;
  if round_record.id is null then return false; end if;
  select * into question_record from public.questions where id = round_record.question_id;

  update public.submissions submission set is_correct = case
    when submission.used_pass then true
    when question_record.answer_kind = 'choice' then upper(trim(submission.answer)) = upper(trim(question_record.answer_text))
    else lower(trim(submission.answer)) = any(
      select lower(trim(answer))
      from unnest(
        case when cardinality(question_record.accepted_answers) > 0
          then question_record.accepted_answers
          else array[question_record.answer_text]
        end
      ) answer
    )
  end
  where submission.round_id = round_record.id and submission.is_correct is null;

  update public.players player
  set is_alive = false, updated_at = now()
  where player.game_id = p_game_id
    and player.connected
    and player.is_alive
    and player.eligible_from_round <= round_record.position
    and not exists (
      select 1 from public.submissions submission
      where submission.player_id = player.id
        and submission.round_id = round_record.id
        and submission.is_correct
    );
  update public.game_rounds set revealed = true where id = round_record.id;
  update public.games
  set phase = 'revealed', ends_at = null, reveal_at = null
  where id = p_game_id and phase in ('question','locked');
  return true;
end; $$;

-- Advances deadline-driven phases using the database clock. Snapshot polling calls
-- this, so refreshes, sleeping tabs and duplicate host tabs cannot stall the show.
create or replace function public._advance_game_clock(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and active for update;
  if selected_game.id is null then return false; end if;

  if selected_game.phase = 'question'
    and selected_game.ends_at is not null
    and selected_game.ends_at <= now() then
    selected_game.reveal_at := coalesce(selected_game.reveal_at, selected_game.ends_at + interval '5 seconds');
    update public.games
    set phase = 'locked', ends_at = null, reveal_at = selected_game.reveal_at
    where id = p_game_id and phase = 'question';
    selected_game.phase := 'locked';
  end if;

  if selected_game.phase = 'locked' and selected_game.reveal_at is null then
    selected_game.reveal_at := now() + interval '5 seconds';
    update public.games set reveal_at = selected_game.reveal_at where id = p_game_id;
  end if;

  if selected_game.phase = 'locked' and selected_game.reveal_at <= now() then
    perform public._score_and_reveal(p_game_id);
  end if;
  return true;
end; $$;

revoke all on function public._score_and_reveal(uuid) from public, anon, authenticated;
revoke all on function public._advance_game_clock(uuid) from public, anon, authenticated;

create or replace function public.host_start_timer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set ends_at = now() + make_interval(secs => timer_seconds),
      reveal_at = now() + make_interval(secs => timer_seconds + 5)
  where id = p_game_id and host_token = p_host_token and active and phase = 'question' and ends_at is null;
  if not found then raise exception 'Timer is already running or host credentials are invalid'; end if;
  return true;
end; $$;

create or replace function public.host_lock_answers(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set phase = 'locked', ends_at = null, reveal_at = now() + interval '5 seconds'
  where id = p_game_id and host_token = p_host_token and active and phase = 'question';
  if not found then raise exception 'Host credentials are invalid or the round is not open'; end if;
  return true;
end; $$;

create or replace function public.host_reveal_answer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.games
  where id = p_game_id and host_token = p_host_token and active and phase in ('question','locked')
  for update;
  if not found then raise exception 'Host credentials are invalid'; end if;
  return public._score_and_reveal(p_game_id);
end; $$;

create or replace function public.host_next_round(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token and active and phase = 'revealed'
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;

  if exists (
    select 1 from public.game_rounds
    where game_id = p_game_id and position = selected_game.current_round + 1
  ) then
    update public.players set has_locked_answer = false, updated_at = now()
    where game_id = p_game_id and connected and is_alive;
    update public.games
    set current_round = current_round + 1,
        phase = 'question',
        ends_at = null,
        reveal_at = null
    where id = p_game_id;
  else
    update public.games
    set phase = 'finished', active = false, ends_at = null, reveal_at = null
    where id = p_game_id;
  end if;
  return true;
end; $$;

create or replace function public.host_end_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set phase = 'finished', active = false, ends_at = null, reveal_at = null
  where id = p_game_id and host_token = p_host_token;
  if not found then raise exception 'Host credentials are invalid'; end if;
  return true;
end; $$;

create or replace function public.host_game_snapshot(p_game_id uuid, p_host_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists (
    select 1 from public.games where id = p_game_id and host_token = p_host_token
  ) then return null; end if;
  perform public._advance_game_clock(p_game_id);
  select jsonb_build_object(
    'game', jsonb_build_object(
      'id',game.id,'pin',game.pin,'phase',game.phase,'current_round',game.current_round,
      'timer_seconds',game.timer_seconds,'ends_at',game.ends_at,'reveal_at',game.reveal_at,
      'active',game.active,'updated_at',game.updated_at
    ),
    'round', case when round_item.id is null then null else jsonb_build_object(
      'id',round_item.id,'position',round_item.position,'revealed',round_item.revealed
    ) end,
    'question', case when question.id is null then null else jsonb_build_object(
      'id',question.id,'percentage',question.percentage,'question_text',question.question_text,
      'question_image_path',question.question_image_path,'answer_kind',question.answer_kind,
      'choices',question.choices,'answer_text',question.answer_text,
      'answer_image_path',question.answer_image_path
    ) end,
    'next_question', (
      select jsonb_build_object(
        'id',next_question.id,'percentage',next_question.percentage,
        'question_image_path',next_question.question_image_path,
        'answer_image_path',next_question.answer_image_path
      )
      from public.game_rounds next_round
      join public.questions next_question on next_question.id=next_round.question_id
      where next_round.game_id=game.id and next_round.position=game.current_round + 1
      limit 1
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',player.id,'name',player.name,'is_alive',player.is_alive,
        'pass_available',player.pass_available,'has_locked_answer',player.has_locked_answer,
        'eligible_from_round',player.eligible_from_round
      ) order by player.joined_at)
      from public.players player where player.game_id=game.id and player.connected
    ),'[]'::jsonb)
  ) into result
  from public.games game
  left join public.game_rounds round_item on round_item.game_id=game.id and round_item.position=game.current_round
  left join public.questions question on question.id=round_item.question_id
  where game.id=p_game_id and game.host_token=p_host_token;
  return result;
end; $$;

create or replace function public.player_snapshot(p_player_id uuid, p_player_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_game_id uuid; result jsonb;
begin
  select game_id into target_game_id from public.players
  where id=p_player_id and player_token=p_player_token and connected;
  if target_game_id is null then return null; end if;
  perform public._advance_game_clock(target_game_id);
  select jsonb_build_object(
    'player', jsonb_build_object(
      'id',player.id,'name',player.name,'is_alive',player.is_alive,
      'pass_available',player.pass_available,'has_locked_answer',player.has_locked_answer,
      'eligible_from_round',player.eligible_from_round
    ),
    'game', jsonb_build_object(
      'id',game.id,'pin',game.pin,'phase',game.phase,'current_round',game.current_round,
      'timer_seconds',game.timer_seconds,'ends_at',game.ends_at,'reveal_at',game.reveal_at,
      'active',game.active,'updated_at',game.updated_at
    ),
    'round', case when round_item.id is null then null else jsonb_build_object(
      'id',round_item.id,'position',round_item.position,'revealed',round_item.revealed
    ) end,
    'question', case when question.id is null then null else jsonb_build_object(
      'id',question.id,'percentage',question.percentage,'answer_kind',question.answer_kind,
      'choices',question.choices,
      'answer_text',case when game.phase='revealed' then question.answer_text else null end
    ) end,
    'submission', case when submission.id is null then null else jsonb_build_object(
      'used_pass',submission.used_pass,
      'is_correct',case when game.phase='revealed' then submission.is_correct else null end
    ) end
  ) into result
  from public.players player
  join public.games game on game.id=player.game_id
  left join public.game_rounds round_item on round_item.game_id=game.id and round_item.position=game.current_round
  left join public.questions question on question.id=round_item.question_id
  left join public.submissions submission on submission.player_id=player.id and submission.round_id=round_item.id
  where player.id=p_player_id and player.player_token=p_player_token and player.connected;
  return result;
end; $$;

grant execute on function public.join_game(text,text) to anon, authenticated;
grant execute on function public.player_leave_game(uuid,uuid) to anon, authenticated;
grant execute on function public.submit_answer(uuid,uuid,uuid,text,boolean) to anon, authenticated;
grant execute on function public.host_start_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_lock_answers(uuid,uuid) to anon, authenticated;
grant execute on function public.host_reveal_answer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.host_end_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_game_snapshot(uuid,uuid) to anon, authenticated;
grant execute on function public.player_snapshot(uuid,uuid) to anon, authenticated;
