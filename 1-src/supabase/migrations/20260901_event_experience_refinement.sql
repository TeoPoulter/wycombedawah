-- WMC One Percent Club — 15-second reading phase and one-hour room lifetime.

create or replace function public.create_game(p_timer_seconds smallint default 30)
returns table(game_id uuid, game_pin text, host_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  new_pin text;
  new_game public.games;
begin
  update public.games
  set active = false, phase = 'finished', read_ends_at = null,
      ends_at = null, reveal_at = null, advance_at = null
  where active and created_at <= now() - interval '1 hour';

  loop
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.games where pin = new_pin and active);
  end loop;
  insert into public.games(pin, timer_seconds)
  values (new_pin, greatest(5, least(p_timer_seconds, 300)))
  returning * into new_game;
  return query select new_game.id, new_game.pin, new_game.host_token;
end; $$;

create or replace function public.join_game(p_pin text, p_name text)
returns table(player_id uuid, player_token uuid, game_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  selected_game public.games;
  new_player public.players;
  first_round integer;
begin
  update public.games
  set active = false, phase = 'finished', read_ends_at = null,
      ends_at = null, reveal_at = null, advance_at = null
  where active and created_at <= now() - interval '1 hour';

  select * into selected_game
  from public.games
  where pin = p_pin and active and phase <> 'finished'
    and created_at > now() - interval '1 hour'
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

create or replace function public._advance_game_clock(p_game_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  select * into selected_game from public.games where id = p_game_id for update;
  if selected_game.id is null or not selected_game.active then return false; end if;

  if selected_game.created_at <= now() - interval '1 hour' then
    update public.games
    set active = false, phase = 'finished', read_ends_at = null,
        ends_at = null, reveal_at = null, advance_at = null
    where id = p_game_id;
    return true;
  end if;

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
  set read_ends_at = now() + interval '15 seconds', ends_at = null, reveal_at = null
  where id = p_game_id and host_token = p_host_token and active
    and phase = 'question' and ends_at is null and read_ends_at is null
    and created_at > now() - interval '1 hour';
  if not found then return true; end if;
  return true;
end; $$;

revoke all on function public._advance_game_clock(uuid) from public, anon, authenticated;
grant execute on function public.create_game(smallint) to anon, authenticated;
grant execute on function public.join_game(text,text) to anon, authenticated;
grant execute on function public.host_start_timer(uuid,uuid) to anon, authenticated;
