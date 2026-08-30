-- WMC One Percent Club — host controls, safe snapshots and starter questions

insert into public.questions (percentage, question_text, answer_text, answer_kind, choices, accepted_answers)
values
  (90, 'Which of these is the odd one out?', 'D', 'choice', '["A — Circle","B — Triangle","C — Square","D — Cube"]', array['D']),
  (80, 'What comes next: 2, 4, 8, 16, ___?', '32', 'text', '[]', array['32','thirty two','thirty-two']),
  (70, 'If yesterday was Sunday, what day is tomorrow?', 'Tuesday', 'text', '[]', array['tuesday']),
  (60, 'Which letter appears once in “minute”, twice in “moment”, and never in “hour”?', 'A', 'choice', '["A — M","B — N","C — O","D — U"]', array['A']),
  (50, 'A farmer has 17 sheep. All but 9 run away. How many remain?', '9', 'text', '[]', array['9','nine']),
  (1, 'What five-letter word becomes shorter when you add two letters to it?', 'Short', 'text', '[]', array['short']);

create or replace function public.host_start_game(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games where id = p_game_id and host_token = p_host_token and active for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if not exists (select 1 from public.players where game_id = p_game_id) then raise exception 'At least one player is required'; end if;
  delete from public.game_rounds where game_id = p_game_id;
  insert into public.game_rounds(game_id, question_id, position)
  select p_game_id, id, row_number() over(order by percentage desc) - 1
  from (select distinct on (percentage) id, percentage from public.questions where enabled order by percentage, last_used_at nulls first, random()) chosen;
  if not exists (select 1 from public.game_rounds where game_id = p_game_id) then raise exception 'No enabled questions are available'; end if;
  update public.questions set last_used_at = now() where id in (select question_id from public.game_rounds where game_id = p_game_id);
  update public.games set phase = 'question', current_round = 0, ends_at = null where id = p_game_id;
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

create or replace function public.host_lock_answers(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.games set phase = 'locked', ends_at = null where id = p_game_id and host_token = p_host_token and active and phase = 'question';
  if not found then raise exception 'Host credentials are invalid or the round is not open'; end if;
  return true;
end; $$;

create or replace function public.host_reveal_answer(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare round_record public.game_rounds; question_record public.questions;
begin
  if not exists (select 1 from public.games where id = p_game_id and host_token = p_host_token and active and phase in ('question','locked')) then raise exception 'Host credentials are invalid'; end if;
  select r.* into round_record from public.game_rounds r join public.games g on g.id = r.game_id and r.position = g.current_round where g.id = p_game_id;
  select * into question_record from public.questions where id = round_record.question_id;
  update public.submissions s set is_correct = case
    when s.used_pass then true
    when question_record.answer_kind = 'choice' then upper(trim(s.answer)) = upper(trim(question_record.answer_text))
    else lower(trim(s.answer)) = any(select lower(trim(a)) from unnest(case when cardinality(question_record.accepted_answers)>0 then question_record.accepted_answers else array[question_record.answer_text] end) a)
  end where s.round_id = round_record.id;
  update public.players p set is_alive = false, updated_at = now() where p.game_id = p_game_id and p.is_alive and not exists (select 1 from public.submissions s where s.player_id = p.id and s.round_id = round_record.id and s.is_correct);
  update public.game_rounds set revealed = true where id = round_record.id;
  update public.games set phase = 'revealed', ends_at = null where id = p_game_id;
  return true;
end; $$;

create or replace function public.host_next_round(p_game_id uuid, p_host_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games where id = p_game_id and host_token = p_host_token and active and phase = 'revealed' for update;
  if selected_game.id is null then raise exception 'Host credentials are invalid'; end if;
  if exists (select 1 from public.game_rounds where game_id = p_game_id and position = selected_game.current_round + 1) then
    update public.players set has_locked_answer = false, updated_at = now() where game_id = p_game_id and is_alive;
    update public.games set current_round = current_round + 1, phase = 'question', ends_at = null where id = p_game_id;
  else
    update public.games set phase = 'finished', active = false, ends_at = null where id = p_game_id;
  end if;
  return true;
end; $$;

create or replace function public.public_game_snapshot(p_pin text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'game', jsonb_build_object('id',g.id,'pin',g.pin,'phase',g.phase,'current_round',g.current_round,'timer_seconds',g.timer_seconds,'ends_at',g.ends_at,'active',g.active),
    'round', case when r.id is null then null else jsonb_build_object('id',r.id,'position',r.position,'revealed',r.revealed) end,
    'question', case when q.id is null then null else jsonb_build_object('id',q.id,'percentage',q.percentage,'question_text',q.question_text,'question_image_path',q.question_image_path,'answer_kind',q.answer_kind,'choices',q.choices,'answer_text',case when g.phase='revealed' then q.answer_text else null end,'answer_image_path',case when g.phase='revealed' then q.answer_image_path else null end) end,
    'players', coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'is_alive',p.is_alive,'pass_available',p.pass_available,'has_locked_answer',p.has_locked_answer) order by p.joined_at) from public.players p where p.game_id=g.id),'[]'::jsonb)
  ) from public.games g
  left join public.game_rounds r on r.game_id=g.id and r.position=g.current_round
  left join public.questions q on q.id=r.question_id
  where g.pin=p_pin order by g.created_at desc limit 1;
$$;

create or replace function public.player_snapshot(p_player_id uuid, p_player_token uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'player', jsonb_build_object('id',p.id,'name',p.name,'is_alive',p.is_alive,'pass_available',p.pass_available,'has_locked_answer',p.has_locked_answer),
    'game', jsonb_build_object('id',g.id,'pin',g.pin,'phase',g.phase,'current_round',g.current_round,'ends_at',g.ends_at,'active',g.active),
    'round', jsonb_build_object('id',r.id,'position',r.position,'revealed',r.revealed),
    'question', case when q.id is null then null else jsonb_build_object('id',q.id,'percentage',q.percentage,'question_text',q.question_text,'question_image_path',q.question_image_path,'answer_kind',q.answer_kind,'choices',q.choices,'answer_text',case when g.phase='revealed' then q.answer_text else null end) end,
    'submission', case when s.id is null then null else jsonb_build_object('used_pass',s.used_pass,'is_correct',case when g.phase='revealed' then s.is_correct else null end) end
  ) from public.players p join public.games g on g.id=p.game_id
  left join public.game_rounds r on r.game_id=g.id and r.position=g.current_round
  left join public.questions q on q.id=r.question_id
  left join public.submissions s on s.player_id=p.id and s.round_id=r.id
  where p.id=p_player_id and p.player_token=p_player_token;
$$;

grant execute on function public.host_start_game(uuid,uuid) to anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_lock_answers(uuid,uuid) to anon, authenticated;
grant execute on function public.host_reveal_answer(uuid,uuid) to anon, authenticated;
grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
grant execute on function public.public_game_snapshot(text) to anon, authenticated;
grant execute on function public.player_snapshot(uuid,uuid) to anon, authenticated;

create policy "public reads question media" on storage.objects for select to anon, authenticated using (bucket_id='question-media');
create policy "admins upload question media" on storage.objects for insert to authenticated with check (bucket_id='question-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admins update question media" on storage.objects for update to authenticated using (bucket_id='question-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));
