UPDATE public.tickets SET status = 'Diagnose' WHERE status = 'Open';
UPDATE public.tickets SET status = 'Engineer Assignment' WHERE status = 'Progress';
ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'Diagnose';