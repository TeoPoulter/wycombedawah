-- WMC One Percent Club — 20-second answer hold, host history and pass visibility.

alter table public.games add column if not exists advance_at timestamptz;

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
  set phase = 'revealed', ends_at = null, reveal_at = null, advance_at = now() + interval '20 seconds'
  where id = p_game_id and phase in ('question','locked');
  return true;
end; $$;

create or replace function public.host_start_timer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set ends_at = now() + make_interval(secs => timer_seconds),
      reveal_at = now() + make_interval(secs => timer_seconds + 5),
      advance_at = null
  where id = p_game_id and host_token = p_host_token and active and phase = 'question' and ends_at is null;
  if not found then raise exception 'Timer is already running or host credentials are invalid'; end if;
  return true;
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

create or replace function public.host_end_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games
  set phase = 'finished', active = false, ends_at = null, reveal_at = null, advance_at = null
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
      'advance_at',game.advance_at,'active',game.active,'updated_at',game.updated_at
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
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',history_question.id,'position',history_round.position,'revealed',history_round.revealed,
        'percentage',history_question.percentage,'question_text',history_question.question_text,
        'question_image_path',history_question.question_image_path,
        'answer_image_path',history_question.answer_image_path,
        'answer_text',history_question.answer_text
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
          where submission.player_id=player.id and submission.round_id=round_item.id
          limit 1
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

revoke all on function public._score_and_reveal(uuid) from public, anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.host_end_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_game_snapshot(uuid,uuid) to anon, authenticated;
