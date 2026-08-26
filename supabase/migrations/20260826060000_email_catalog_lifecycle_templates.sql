-- New lifecycle/billing templates + 3-day trial copy.
-- Full branded HTML is in supabase/seed_communication_templates_*.sql (regenerated from src/lib/email/templates.ts).

update public.communication_templates
set
  html = replace(replace(html, '14-day trial', '3-day trial'), '14-day', '3-day'),
  subject = replace(subject, '14-day', '3-day'),
  description = replace(description, '14-day', '3-day'),
  updated_at = now()
where html like '%14-day%' or subject like '%14-day%' or description like '%14-day%';

insert into public.communication_templates (id, category, name, subject, html, description)
select 'password-reset', 'auth', 'Password reset', 'Reset your InuaBiz password', html,
  'Auth recovery for email/password vendors. Link works once.'
from public.communication_templates where id = 'confirm-its-you'
on conflict (id) do update set
  category = excluded.category, name = excluded.name, subject = excluded.subject,
  html = excluded.html, description = excluded.description, updated_at = now();

insert into public.communication_templates (id, category, name, subject, html, description)
select 'onboarding-incomplete', 'auth', 'Finish shop setup', 'Finish setting up your InuaBiz shop', html,
  'Drop-off lock: signed up but did not complete onboarding.'
from public.communication_templates where id = 'welcome-trial'
on conflict (id) do update set
  category = excluded.category, name = excluded.name, subject = excluded.subject,
  html = excluded.html, description = excluded.description, updated_at = now();

insert into public.communication_templates (id, category, name, subject, html, description)
select 'extra-shop-paid', 'transactional', 'Extra shop paid', 'New shop is paid for — KES 3,000', html,
  'STK succeeded; extra shop row inserted.'
from public.communication_templates where id = 'subscription-paid'
on conflict (id) do update set
  category = excluded.category, name = excluded.name, subject = excluded.subject,
  html = excluded.html, description = excluded.description, updated_at = now();

insert into public.communication_templates (id, category, name, subject, html, description)
select 'extra-shop-failed', 'transactional', 'Extra shop STK failed', 'Extra shop PIN did not go through — KES 3,000', html,
  'Extra-shop STK cancelled or timed out; shop was not created.'
from public.communication_templates where id = 'payment-stk-failed'
on conflict (id) do update set
  category = excluded.category, name = excluded.name, subject = excluded.subject,
  html = excluded.html, description = excluded.description, updated_at = now();

insert into public.communication_templates (id, category, name, subject, html, description)
select 'fiscal-invoice', 'transactional', 'Fiscal invoice', 'Tax invoice — InuaBiz', html,
  'Audit-ready INB-YYYY-NNNN invoice after a PAID/CREDIT sale.'
from public.communication_templates where id = 'sale-receipt'
on conflict (id) do update set
  category = excluded.category, name = excluded.name, subject = excluded.subject,
  html = excluded.html, description = excluded.description, updated_at = now();
