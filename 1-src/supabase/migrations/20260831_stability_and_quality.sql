-- WMC One Percent Club — idempotent host controls and precise elimination state.

alter table public.players
  add column if not exists eliminated_at_round integer;

create or replace function public.host_start_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not selected_game.active or selected_game.phase <> 'lobby' then return true; end if;
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
    order by percentage, times_used asc, last_used_at nulls first, random()
  ) chosen;
  if not exists (select 1 from public.game_rounds where game_id = p_game_id) then
    raise exception 'No enabled questions are available';
  end if;

  update public.questions
  set last_used_at = now(), times_used = times_used + 1
  where id in (select question_id from public.game_rounds where game_id = p_game_id);
  update public.players
  set eligible_from_round = 0, has_locked_answer = false, eliminated_at_round = null
  where game_id = p_game_id and connected;
  update public.games
  set phase = 'question', current_round = 0, ends_at = null, reveal_at = null, advance_at = null
  where id = p_game_id;
  return true;
end; $$;

create or replace function public._score_and_reveal(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  round_record public.game_rounds;
  question_record public.questions;
  round_eligible integer;
  round_correct integer;
  round_incorrect integer;
  round_no_answer integer;
  round_passes integer;
begin
  select round_item.* into round_record
  from public.game_rounds round_item
  join public.games game on game.id = round_item.game_id and round_item.position = game.current_round
  where game.id = p_game_id;
  if round_record.id is null then return false; end if;
  if round_record.revealed then return true; end if;
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

  select
    count(*)::integer,
    count(*) filter (where submission.is_correct and not submission.used_pass)::integer,
    count(*) filter (where submission.is_correct is false)::integer,
    count(*) filter (where submission.used_pass)::integer,
    count(*) filter (where submission.id is null)::integer
  into round_eligible, round_correct, round_incorrect, round_passes, round_no_answer
  from public.players player
  left join public.submissions submission
    on submission.player_id = player.id and submission.round_id = round_record.id
  where player.game_id = p_game_id
    and player.connected
    and player.is_alive
    and player.eligible_from_round <= round_record.position;

  update public.players player
  set is_alive = false, eliminated_at_round = round_record.position, updated_at = now()
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

  update public.game_rounds set
    revealed = true,
    eligible_count = round_eligible,
    correct_count = round_correct,
    incorrect_count = round_incorrect,
    no_answer_count = round_no_answer,
    pass_count = round_passes
  where id = round_record.id;
  update public.games
  set phase = 'revealed', ends_at = null, reveal_at = null, advance_at = now() + interval '20 seconds'
  where id = p_game_id and phase in ('question','locked');
  return true;
end; $$;

create or replace function public.host_start_timer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not selected_game.active or selected_game.phase <> 'question' or selected_game.ends_at is not null then return true; end if;
  update public.games
  set ends_at = now() + make_interval(secs => timer_seconds),
      reveal_at = now() + make_interval(secs => timer_seconds + 5),
      advance_at = null
  where id = p_game_id;
  return true;
end; $$;

create or replace function public.host_lock_answers(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not selected_game.active or selected_game.phase <> 'question' then return true; end if;
  update public.games
  set phase = 'locked', ends_at = null, reveal_at = now() + interval '5 seconds'
  where id = p_game_id;
  return true;
end; $$;

create or replace function public.host_reveal_answer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not selected_game.active or selected_game.phase = 'revealed' then return true; end if;
  if selected_game.phase not in ('question','locked') then return true; end if;
  return public._score_and_reveal(p_game_id);
end; $$;

create or replace function public.host_next_round(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not selected_game.active or selected_game.phase = 'finished' then return true; end if;
  if selected_game.phase <> 'revealed' then return true; end if;

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
        reveal_at = null,
        advance_at = null
    where id = p_game_id;
  else
    update public.games
    set phase = 'finished', active = false, ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
  end if;
  return true;
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
      'eligible_from_round',player.eligible_from_round,
      'eliminated_at_round',player.eliminated_at_round
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
      'question_image_path',case when not player.is_alive then question.question_image_path else null end,
      'answer_image_path',case when not player.is_alive and game.phase='revealed' then question.answer_image_path else null end,
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

revoke all on function public._score_and_reveal(uuid) from public, anon, authenticated;
grant execute on function public.host_start_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_lock_answers(uuid,uuid) to anon, authenticated;
grant execute on function public.host_reveal_answer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.player_snapshot(uuid,uuid) to anon, authenticated;
