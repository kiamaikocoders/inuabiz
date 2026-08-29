-- Payer name from companion M-Pesa SMS (and Daraja C2B) shown with the confirmation code.

alter table public.sales
  add column if not exists mpesa_payer_name text;

comment on column public.sales.mpesa_payer_name is
  'Person or bank that paid, from companion M-Pesa SMS or Daraja C2B. Shown with the confirmation code.';

alter table public.companion_sms_events
  add column if not exists sender_name text;

comment on column public.companion_sms_events.sender_name is
  'Payer name or bank parsed from the forwarded M-Pesa SMS.';
