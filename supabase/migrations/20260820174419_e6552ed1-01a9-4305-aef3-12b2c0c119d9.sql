ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS notify_email_new_device boolean NOT NULL DEFAULT true;