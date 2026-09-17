DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
CREATE POLICY "Anyone can view tickets"
ON public.tickets
FOR SELECT
TO public
USING (true);