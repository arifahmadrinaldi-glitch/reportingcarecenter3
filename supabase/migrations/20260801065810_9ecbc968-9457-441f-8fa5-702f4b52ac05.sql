CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'Open',
  keterangan text,
  customer text,
  nama_lokasi text,
  tiket_mantools text,
  tiket_noxis text,
  layanan text,
  jenis_ticket text,
  asal_gangguan text,
  regional text,
  indikasi_gangguan text,
  last_update text,
  team_sem text,
  open_by text,
  tanggal_open timestamptz,
  tanggal_close timestamptz,
  durasi text,
  teknisi text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete tickets" ON public.tickets FOR DELETE USING (true);

CREATE INDEX idx_tickets_created_at ON public.tickets (created_at DESC);
CREATE INDEX idx_tickets_deleted_at ON public.tickets (deleted_at);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

INSERT INTO public.tickets (status, keterangan, customer, nama_lokasi, tiket_mantools, tiket_noxis, layanan, jenis_ticket, asal_gangguan, regional, indikasi_gangguan, last_update, team_sem, open_by, tanggal_open, tanggal_close, durasi, teknisi) VALUES
('Pending Transport', 'Pending sampai: 2026-08-01 10:00:00', 'TELKOM DSO', 'TELKOM DSO - STO Waris #2', 'OLO.202607.0917', 'TCM.MB.0726.0666', 'VSAT Star', 'Corrective Maintenance', 'Telkomsat', 'Regional 1', 'KIT offline', 'Menunggu transport ke lokasi, ETA besok pagi', 'SEM 1', 'Andi', '2026-07-26 08:15:00+07', NULL, '5d 2h', 'Budi Santoso'),
('Pending Spare', 'Pending sampai: 2026-08-02 10:00:00', 'TELKOM DCS', 'TELKOM DCS - Jatinegara - Sendawar 2', 'OLO.202607.0872', 'TCM.MB.0726.0632', 'VSAT Star', 'Corrective Maintenance', 'Telkomsat', 'Regional 2', 'KIT 2 offline', 'Menunggu kedatangan spare BUC dari gudang pusat', 'SEM 2', 'Rina', '2026-07-26 09:40:00+07', NULL, '5d 1h', 'Agus Prasetyo'),
('Pending Transport', 'Pending sampai: 2026-08-01 10:00:00', 'TELKOM DWS', 'MLU025-TB Longnawang', 'OLO.202607.0844', 'TCM.MB.0726.0609', 'Mangostar', 'Corrective Maintenance', 'Telkomsat', 'Regional 2', 'Inverter OFF', 'Akses lokasi hanya via pesawat perintis', 'SEM 2', 'Dedi', '2026-07-25 14:20:00+07', NULL, '6d 4h', 'Joko Susilo'),
('Close', 'Close', 'TELKOMSEL', 'TELKOMSEL - MXU051 - BINONTOAN', 'OLO.202607.0779', 'TCM.MB.0726.0562', 'AIS', 'Corrective Maintenance', 'Telkomsat', 'Regional 2', 'Mikrotik bermasalah', 'Perangkat sudah normal setelah penggantian mikrotik', 'SEM 3', 'Sari', '2026-07-24 10:05:00+07', '2026-07-25 16:30:00+07', '1d 6h', 'Hendra Wijaya'),
('Close', 'Close', 'TELKOM DWS', 'Saibi 1-Saibi 1', 'OLO.202607.0643', 'TCM.MB.0726.0482', 'Star Data', 'Corrective Maintenance', 'Telkomsat', 'Regional 1', 'Mikrotik failure', 'Sudah UP dan trafik normal kembali', 'SEM 1', 'Andi', '2026-07-22 07:30:00+07', '2026-07-23 11:45:00+07', '1d 4h', 'Budi Santoso'),
('Pending Customer', 'Pending sampai: 2026-08-04 10:00:00', 'XL AXIATA TBK', 'Matak-PAYALAMAN, KEC. PALMATAK, KEPULAUAN ANAMBAS, KEPRI', 'OLO.202607.0620', 'TPM.MB.0726.0468', 'VIS', 'Preventive Maintenance', 'Telkomsat', 'Regional 4', 'Reposisi Antena', 'Menunggu approval customer untuk jadwal reposisi antena di rooftop', 'SEM 4', 'Rina', '2026-07-21 13:10:00+07', NULL, '10d 3h', 'Agus Prasetyo'),
('Pending', 'Pending sampai: 2026-08-01 10:00:00', 'XL AXIATA', 'XLSMART_ENIMUARABAKAU', 'OLO.202607.0349', 'TCM.MB.0726.0261', 'SBS', 'Corrective Maintenance', 'Telkomsat', 'Regional 2', 'Pengecekan perangkat', 'Sedang dianalisa tim NOC', 'SEM 2', 'Dedi', '2026-07-20 16:55:00+07', NULL, '11d 2h', 'Hendra Wijaya');