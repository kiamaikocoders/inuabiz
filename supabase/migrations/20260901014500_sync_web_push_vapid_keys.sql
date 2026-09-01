-- Sync Web Push VAPID public key with Supabase Edge secrets (private key not stored in DB).

update public.platform_settings
set
  value = to_jsonb('BLkxmJ6yrUM7BVFSjsnyw9lePjNDOKsLEzBrmu-NGMHVCP-JUzG9EI9XVM-R4PURWnUr9MVwZjulmVPTiTTpfNw'::text),
  description = 'Web Push VAPID public key (URL-safe). Private key in Supabase Edge secrets.',
  updated_at = now()
where key = 'push.vapid_public';
