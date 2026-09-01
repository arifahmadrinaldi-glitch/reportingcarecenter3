ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS update_history jsonb NOT NULL DEFAULT '[]'::jsonb;