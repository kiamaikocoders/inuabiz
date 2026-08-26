-- Allow the admin UI (anon demo + authenticated) to read the Figma catalog.
grant select on public.communication_templates to anon, authenticated;

drop policy if exists communication_templates_read on public.communication_templates;
create policy communication_templates_read on public.communication_templates
  for select to anon, authenticated
  using (true);
