-- One-time bootstrap for the first authenticated admin.
create or replace function public.claim_first_admin()
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.admins) then
    insert into public.admins(user_id) values (auth.uid()) on conflict do nothing;
  end if;
  return exists (select 1 from public.admins where user_id = auth.uid());
end; $$;
grant execute on function public.claim_first_admin() to authenticated;

-- Reliable RLS-safe check used by the admin portal after sign-in.
create or replace function public.is_current_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_current_admin() to authenticated;

-- Table-level access is still constrained by the administrator RLS policies.
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.questions to authenticated;

create policy "admins delete question media" on storage.objects for delete to authenticated
using (bucket_id='question-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));
