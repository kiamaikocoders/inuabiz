create or replace function public.admin_ops_pulse()
returns jsonb
language sql
volatile
security definer
set search_path = public, private
as $$
  select private.admin_ops_pulse_payload();
$$;

revoke all on function public.admin_ops_pulse() from public, anon;
grant execute on function public.admin_ops_pulse() to authenticated;
;
