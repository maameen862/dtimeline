CREATE TABLE public.parental_locks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  pin_hash text,
  pin_salt text,
  lock_delete boolean NOT NULL DEFAULT true,
  lock_export boolean NOT NULL DEFAULT true,
  lock_access boolean NOT NULL DEFAULT false,
  recovery_email text,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parental_locks TO authenticated;
GRANT ALL ON public.parental_locks TO service_role;
ALTER TABLE public.parental_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own parental lock" ON public.parental_locks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER parental_locks_updated BEFORE UPDATE ON public.parental_locks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_codes TO authenticated;
GRANT ALL ON public.recovery_codes TO service_role;
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recovery codes" ON public.recovery_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_interval_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_sync_interval_minutes integer NOT NULL DEFAULT 15;