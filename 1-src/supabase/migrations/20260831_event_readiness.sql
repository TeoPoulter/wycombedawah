-- WMC One Percent Club — event-readiness lifecycle polish.

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
    set phase = 'finished', active = false, ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
  elsif exists (
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

grant execute on function public.host_next_round(uuid,uuid) to anon, authenticated;
