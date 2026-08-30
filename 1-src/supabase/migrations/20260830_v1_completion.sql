-- WMC One Percent Club V1 completion migration.
-- Safe to run after schema.sql, admin.sql and gameplay.sql.

alter table public.questions add column if not exists last_used_at timestamptz;

create or replace function public.create_game(p_timer_seconds smallint default 30)
returns table(game_id uuid, game_pin text, host_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  new_pin text;
  new_game public.games;
begin
  update public.games set active = false, phase = 'finished', ends_at = null
  where active and created_at < now() - interval '12 hours';
  loop
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.games where pin = new_pin and active);
  end loop;
  insert into public.games(pin, timer_seconds)
  values (new_pin, greatest(5, least(p_timer_seconds, 300)))
  returning * into new_game;
  return query select new_game.id, new_game.pin, new_game.host_token;
end; $$;

create or replace function public.host_start_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games
  where id = p_game_id and host_token = p_host_token and active and phase = 'lobby'
  for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid or the game has already started'; end if;
  if not exists (select 1 from public.players where game_id = p_game_id) then raise exception 'At least one player is required'; end if;

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
  update public.games set phase = 'question', current_round = 0, ends_at = null
  where id = p_game_id;
  return true;
end; $$;

create or replace function public.host_start_timer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games set ends_at = now() + make_interval(secs => timer_seconds)
  where id = p_game_id and host_token = p_host_token and active and phase = 'question' and ends_at is null;
  if not found then raise exception 'Timer is already running or host credentials are invalid'; end if;
  return true;
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
  selected_player public.players;
  selected_round public.game_rounds;
  selected_game public.games;
  question_level smallint;
begin
  select * into selected_player from public.players
  where id = p_player_id and player_token = p_player_token for update;
  if selected_player.id is null or not selected_player.is_alive then raise exception 'Player is not eligible'; end if;

  select * into selected_round from public.game_rounds where id = p_round_id;
  select * into selected_game from public.games
  where id = selected_player.game_id and phase = 'question' and active;
  if selected_round.id is null or selected_round.game_id <> selected_game.id or selected_round.position <> selected_game.current_round then
    raise exception 'Round is not accepting answers';
  end if;
  if selected_game.ends_at is null then raise exception 'The host has not started the timer'; end if;
  if now() > selected_game.ends_at then raise exception 'Time has expired'; end if;

  select percentage into question_level from public.questions where id = selected_round.question_id;
  if p_use_pass and (not selected_player.pass_available or question_level = 1) then
    raise exception 'Pass is not available';
  end if;
  if not p_use_pass and nullif(trim(p_answer), '') is null then raise exception 'An answer is required'; end if;

  insert into public.submissions(game_id, player_id, round_id, answer, used_pass)
  values (selected_game.id, selected_player.id, selected_round.id, case when p_use_pass then null else trim(p_answer) end, p_use_pass);
  update public.players
  set has_locked_answer = true,
      pass_available = case when p_use_pass then false else pass_available end,
      updated_at = now()
  where id = selected_player.id;
  return true;
exception when unique_violation then
  raise exception 'Your answer is already final';
end; $$;

create or replace function public.host_reveal_answer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  round_record public.game_rounds;
  question_record public.questions;
begin
  if not exists (
    select 1 from public.games
    where id = p_game_id and host_token = p_host_token and active and phase in ('question','locked')
  ) then raise exception 'Host credentials are invalid'; end if;

  select r.* into round_record
  from public.game_rounds r
  join public.games g on g.id = r.game_id and r.position = g.current_round
  where g.id = p_game_id;
  select * into question_record from public.questions where id = round_record.question_id;

  update public.submissions s set is_correct = case
    when s.used_pass then true
    when question_record.answer_kind = 'choice' then upper(trim(s.answer)) = upper(trim(question_record.answer_text))
    else lower(trim(s.answer)) = any(
      select lower(trim(answer))
      from unnest(
        case when cardinality(question_record.accepted_answers) > 0
          then question_record.accepted_answers
          else array[question_record.answer_text]
        end
      ) answer
    )
  end
  where s.round_id = round_record.id;

  update public.players player
  set is_alive = false, updated_at = now()
  where player.game_id = p_game_id
    and player.is_alive
    and not exists (
      select 1 from public.submissions submission
      where submission.player_id = player.id
        and submission.round_id = round_record.id
        and submission.is_correct
    );
  update public.game_rounds set revealed = true where id = round_record.id;
  update public.games set phase = 'revealed', ends_at = null where id = p_game_id;
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
    where game_id = p_game_id and is_alive;
    update public.games
    set current_round = current_round + 1, phase = 'question', ends_at = null
    where id = p_game_id;
  else
    update public.games set phase = 'finished', active = false, ends_at = null
    where id = p_game_id;
  end if;
  return true;
end; $$;

create or replace function public.host_end_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games set phase = 'finished', active = false, ends_at = null
  where id = p_game_id and host_token = p_host_token;
  if not found then raise exception 'Host credentials are invalid'; end if;
  return true;
end; $$;

create or replace function public.public_game_snapshot(p_pin text)
returns jsonb language sql security definer set search_path = public stable as $$
  select null::jsonb;
$$;

create or replace function public.host_game_snapshot(p_game_id uuid, p_host_token uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'game', jsonb_build_object(
      'id',g.id,'pin',g.pin,'phase',g.phase,'current_round',g.current_round,
      'timer_seconds',g.timer_seconds,'ends_at',g.ends_at,'active',g.active
    ),
    'round', case when r.id is null then null else jsonb_build_object('id',r.id,'position',r.position,'revealed',r.revealed) end,
    'question', case when q.id is null then null else jsonb_build_object(
      'id',q.id,'percentage',q.percentage,'question_text',q.question_text,
      'question_image_path',q.question_image_path,'answer_kind',q.answer_kind,'choices',q.choices,
      'answer_text',case when g.phase='revealed' then q.answer_text else null end,
      'answer_image_path',case when g.phase='revealed' then q.answer_image_path else null end
    ) end,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',player.id,'name',player.name,'is_alive',player.is_alive,
        'pass_available',player.pass_available,'has_locked_answer',player.has_locked_answer
      ) order by player.joined_at)
      from public.players player where player.game_id=g.id
    ),'[]'::jsonb)
  )
  from public.games g
  left join public.game_rounds r on r.game_id=g.id and r.position=g.current_round
  left join public.questions q on q.id=r.question_id
  where g.id=p_game_id and g.host_token=p_host_token;
$$;

create or replace function public.player_snapshot(p_player_id uuid, p_player_token uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'id',p.id,'name',p.name,'is_alive',p.is_alive,
      'pass_available',p.pass_available,'has_locked_answer',p.has_locked_answer
    ),
    'game', jsonb_build_object(
      'id',g.id,'pin',g.pin,'phase',g.phase,'current_round',g.current_round,
      'timer_seconds',g.timer_seconds,'ends_at',g.ends_at,'active',g.active
    ),
    'round', case when r.id is null then null else jsonb_build_object('id',r.id,'position',r.position,'revealed',r.revealed) end,
    'question', case when q.id is null then null else jsonb_build_object(
      'id',q.id,'percentage',q.percentage,'answer_kind',q.answer_kind,'choices',q.choices,
      'answer_text',case when g.phase='revealed' then q.answer_text else null end
    ) end,
    'submission', case when s.id is null then null else jsonb_build_object(
      'used_pass',s.used_pass,'is_correct',case when g.phase='revealed' then s.is_correct else null end
    ) end
  )
  from public.players p
  join public.games g on g.id=p.game_id
  left join public.game_rounds r on r.game_id=g.id and r.position=g.current_round
  left join public.questions q on q.id=r.question_id
  left join public.submissions s on s.player_id=p.id and s.round_id=r.id
  where p.id=p_player_id and p.player_token=p_player_token;
$$;

grant execute on function public.host_start_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_reveal_answer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.host_end_game(uuid,uuid) to anon, authenticated;
grant execute on function public.create_game(smallint) to anon, authenticated;
grant execute on function public.host_game_snapshot(uuid,uuid) to anon, authenticated;
grant execute on function public.player_snapshot(uuid,uuid) to anon, authenticated;
grant execute on function public.submit_answer(uuid,uuid,uuid,text,boolean) to anon, authenticated;
