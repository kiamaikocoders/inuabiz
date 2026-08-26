-- Service-role-only secret store (used when Edge Function Dashboard secrets
-- cannot be set via MCP / CLI). Populate via Dashboard SQL or MCP execute_sql.
-- Do NOT commit real credential values in this file.

create table if not exists private.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.app_secrets from public, anon, authenticated;

create or replace function public.get_app_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v text;
  jwt_role text := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if jwt_role is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;
  select s.value into v from private.app_secrets s where s.name = p_name;
  return v;
end;
$$;

revoke all on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to service_role;
