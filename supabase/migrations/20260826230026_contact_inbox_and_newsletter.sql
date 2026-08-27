-- Contact inbox (WYA app_feedback pattern) + newsletter subscribers.
-- Super-admins read/update via RLS; public writes go through Edge Functions (service_role).

alter table public.contact_messages
  add column if not exists status text not null default 'new',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contact_messages_status_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_status_check
      check (status in ('new', 'read', 'archived'));
  end if;
end $$;

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'footer',
  confirmed boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists newsletter_subscribers_admin on public.newsletter_subscribers;
create policy newsletter_subscribers_admin on public.newsletter_subscribers
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, update, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
revoke insert on public.newsletter_subscribers from anon, authenticated;

grant select, update, delete on public.contact_messages to authenticated;

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

insert into public.platform_settings (key, value, description)
values (
  'email.ops_inbox',
  '"hello@inuabiz.co.ke"'::jsonb,
  'Where website contact messages are emailed, in addition to SUPER_ADMIN accounts'
)
on conflict (key) do nothing;

insert into public.communication_templates (id, category, name, subject, html, description)
values
(
  'contact-inbound',
  'ops',
  'Contact inbound — admin',
  'New contact: {{ .customer_name }}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>InuaBiz</title></head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr><td align="center" style="padding:20px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 14px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
            <tr><td style="padding:20px;">
              <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;">INBOX</span>
              <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#121816;">New website</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#F4A261;">contact.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#121816;">{{ .customer_name }} wrote in.</p>
              <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;color:#66736B;">Topic: {{ .topic }}</p>
              <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;color:#66736B;">Email: {{ .visitor_email }}</p>
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:13px;color:#66736B;">Phone: {{ .visitor_phone }}</p>
              <p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#121816;white-space:pre-wrap;">{{ .note }}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="background:#0B6E4F;border-radius:999px;">
                  <a href="https://app.inuabiz.co.ke/admin/inbox" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open inbox</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>$html$,
  'Email to ops when someone submits /contact. Reply-To is the visitor.'
),
(
  'newsletter-welcome',
  'ops',
  'Newsletter welcome',
  'You''re on the InuaBiz list',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>InuaBiz</title></head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr><td align="center" style="padding:20px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 14px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
            <tr><td style="padding:20px;">
              <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;">LIST</span>
              <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#121816;">You're on</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#F4A261;">the list.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#121816;">Hello,</p>
              <p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Asante. We will send till notes, pricing changes and Nairobi shop stories to this address. You can leave the list any time — write hello@inuabiz.co.ke.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="background:#0B6E4F;border-radius:999px;">
                  <a href="https://www.inuabiz.co.ke" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open InuaBiz</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>$html$,
  'Confirmation after footer newsletter subscribe.'
)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
