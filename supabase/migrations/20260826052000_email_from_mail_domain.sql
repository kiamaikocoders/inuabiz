-- Match the Resend ↔ Supabase SMTP sender (mail.inuabiz.co.ke).
update public.platform_settings
set
  value = '"support@mail.inuabiz.co.ke"'::jsonb,
  description = 'Transactional from-address (Resend verified domain mail.inuabiz.co.ke)',
  updated_at = now()
where key = 'email.from_email';
