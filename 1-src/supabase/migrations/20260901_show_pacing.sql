-- WMC One Percent Club — authoritative reading time and refined answer controls.

alter table public.games
  add column if not exists read_ends_at timestamptz;

alter table public.questions
  add column if not exists input_mode text not null default 'default';

update public.questions
set input_mode = 'digits-3'
where question_image_path = '/1/question-bank/80-2-question.png';

update public.questions set choices = '["A","B","C"]'::jsonb
where question_image_path in (
  '/1/question-bank/90-1-question.png',
  '/1/question-bank/90-2-question.png'
);

update public.questions set choices = '["A","B"]'::jsonb
where question_image_path = '/1/question-bank/90-3-question.png';

create or replace function public._advance_game_clock(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games where id = p_game_id for update;
  if selected_game.id is null or not selected_game.active then return false; end if;

  if selected_game.phase = 'question'
     and selected_game.ends_at is null
     and selected_game.read_ends_at is not null
     and selected_game.read_ends_at <= now() then
    update public.games
    set read_ends_at = null,
        ends_at = now() + make_interval(secs => timer_seconds),
        reveal_at = now() + make_interval(secs => timer_seconds + 5)
    where id = p_game_id and phase = 'question' and ends_at is null;
    select * into selected_game from public.games where id = p_game_id;
  end if;

  if selected_game.phase = 'question'
     and selected_game.ends_at is not null
     and selected_game.ends_at <= now() then
    update public.games
    set phase = 'locked', read_ends_at = null, ends_at = null,
        reveal_at = coalesce(selected_game.reveal_at, now() + interval '5 seconds')
    where id = p_game_id and phase = 'question';
    select * into selected_game from public.games where id = p_game_id;
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

create or replace function public.host_start_timer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set read_ends_at = now() + interval '10 seconds', ends_at = null, reveal_at = null
  where id = p_game_id and host_token = p_host_token and active
    and phase = 'question' and ends_at is null and read_ends_at is null;
  if not found then return true; end if;
  return true;
end; $$;

create or replace function public.host_lock_answers(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set phase = 'locked', read_ends_at = null, ends_at = null, reveal_at = now() + interval '5 seconds'
  where id = p_game_id and host_token = p_host_token and active
    and phase = 'question' and ends_at is not null;
  if not found then return true; end if;
  return true;
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

  if not exists (
    select 1 from public.players
    where game_id = p_game_id and connected and is_alive
  ) then
    update public.games
    set phase = 'finished', active = false, read_ends_at = null,
        ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
  elsif exists (
    select 1 from public.game_rounds
    where game_id = p_game_id and position = selected_game.current_round + 1
  ) then
    update public.players set has_locked_answer = false, updated_at = now()
    where game_id = p_game_id and connected and is_alive;
    update public.games
    set current_round = current_round + 1, phase = 'question',
        read_ends_at = null, ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
  else
    update public.games
    set phase = 'finished', active = false, read_ends_at = null,
        ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
  end if;
  return true;
end; $$;

create or replace function public.host_end_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set phase = 'finished', active = false, read_ends_at = null,
      ends_at = null, reveal_at = null, advance_at = null
  where id = p_game_id and host_token = p_host_token;
  if not found then return true; end if;
  return true;
end; $$;

create or replace function public.host_game_snapshot(p_game_id uuid, p_host_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists (select 1 from public.games where id = p_game_id and host_token = p_host_token) then return null; end if;
  perform public._advance_game_clock(p_game_id);
  select jsonb_build_object(
    'game', jsonb_build_object(
      'id',game.id,'pin',game.pin,'phase',game.phase,'current_round',game.current_round,
      'timer_seconds',game.timer_seconds,'read_ends_at',game.read_ends_at,
      'ends_at',game.ends_at,'reveal_at',game.reveal_at,'advance_at',game.advance_at,
      'active',game.active,'updated_at',game.updated_at
    ),
    'round', case when round_item.id is null then null else jsonb_build_object(
      'id',round_item.id,'position',round_item.position,'revealed',round_item.revealed
    ) end,
    'question', case when question.id is null then null else jsonb_build_object(
      'id',question.id,'percentage',question.percentage,'question_text',question.question_text,
      'question_image_path',question.question_image_path,'answer_kind',question.answer_kind,
      'choices',question.choices,'input_mode',question.input_mode,'answer_text',question.answer_text,
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
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',history_question.id,'position',history_round.position,'revealed',history_round.revealed,
        'percentage',history_question.percentage,'question_text',history_question.question_text,
        'question_image_path',history_question.question_image_path,
        'answer_image_path',history_question.answer_image_path,'answer_text',history_question.answer_text,
        'eligible_count',history_round.eligible_count,'correct_count',history_round.correct_count,
        'incorrect_count',history_round.incorrect_count,'no_answer_count',history_round.no_answer_count,
        'pass_count',history_round.pass_count
      ) order by history_round.position)
      from public.game_rounds history_round
      join public.questions history_question on history_question.id=history_round.question_id
      where history_round.game_id=game.id and history_round.position <= game.current_round
    ),'[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',player.id,'name',player.name,'is_alive',player.is_alive,
        'pass_available',player.pass_available,'has_locked_answer',player.has_locked_answer,
        'eligible_from_round',player.eligible_from_round,
        'used_pass',coalesce((
          select submission.used_pass from public.submissions submission
          where submission.player_id=player.id and submission.round_id=round_item.id limit 1
        ),false)
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
      'timer_seconds',game.timer_seconds,'read_ends_at',game.read_ends_at,
      'ends_at',game.ends_at,'reveal_at',game.reveal_at,'advance_at',game.advance_at,
      'active',game.active,'updated_at',game.updated_at
    ),
    'round', case when round_item.id is null then null else jsonb_build_object(
      'id',round_item.id,'position',round_item.position,'revealed',round_item.revealed
    ) end,
    'question', case when question.id is null then null else jsonb_build_object(
      'id',question.id,'percentage',question.percentage,'answer_kind',question.answer_kind,
      'choices',question.choices,'input_mode',question.input_mode,
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

revoke all on function public._advance_game_clock(uuid) from public, anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_lock_answers(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.host_end_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_game_snapshot(uuid,uuid) to anon, authenticated;
grant execute on function public.player_snapshot(uuid,uuid) to anon, authenticated;
