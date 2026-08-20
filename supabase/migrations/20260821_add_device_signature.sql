-- Add device_signature column for stable device identification
-- This allows recognition of devices even if localStorage is cleared
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS device_signature text;

-- Create index for efficient lookups by device_signature
CREATE INDEX IF NOT EXISTS idx_devices_user_signature 
  ON public.devices(user_id, device_signature);

-- Add unique constraint for device_signature per user (optional duplicates allowed during transition)
-- Note: We don't enforce uniqueness since a user might sign in from the same physical device
-- in different browsers, which should create separate device records
