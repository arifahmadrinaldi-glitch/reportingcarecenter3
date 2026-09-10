CREATE TABLE public.telegram_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL UNIQUE,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_chats TO service_role;

ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages telegram chats" ON public.telegram_chats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_telegram_chats_updated_at BEFORE UPDATE ON public.telegram_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();