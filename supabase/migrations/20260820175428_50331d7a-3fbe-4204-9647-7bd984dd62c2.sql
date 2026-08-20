ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS screen_time_limit_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notify_screen_time_limit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_device_push boolean NOT NULL DEFAULT true;