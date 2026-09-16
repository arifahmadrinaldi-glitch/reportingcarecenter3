DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;

CREATE POLICY "Authenticated users can view tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (true);