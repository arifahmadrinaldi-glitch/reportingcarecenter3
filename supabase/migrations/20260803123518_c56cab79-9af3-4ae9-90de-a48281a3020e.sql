CREATE TABLE public.daily_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal date,
  on_duty text,
  shift text,
  category text,
  source_information text,
  to_do text,
  product text,
  customer text,
  nama_lokasi text,
  kontak_pic text,
  rfo_general text,
  type_modem_sn text,
  problem text,
  action text,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activities TO anon;
GRANT ALL ON public.daily_activities TO service_role;

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily activities" ON public.daily_activities FOR SELECT USING (true);
CREATE POLICY "Anyone can create daily activities" ON public.daily_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update daily activities" ON public.daily_activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete daily activities" ON public.daily_activities FOR DELETE USING (true);

CREATE TRIGGER update_daily_activities_updated_at BEFORE UPDATE ON public.daily_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();