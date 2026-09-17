DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can delete tickets" ON public.tickets;

CREATE POLICY "Only approved account can view tickets"
ON public.tickets FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can create tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can update tickets"
ON public.tickets FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can delete tickets"
ON public.tickets FOR DELETE TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

DROP POLICY IF EXISTS "Anyone can view daily activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Anyone can create daily activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Anyone can update daily activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Anyone can delete daily activities" ON public.daily_activities;

CREATE POLICY "Only approved account can view daily activities"
ON public.daily_activities FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can create daily activities"
ON public.daily_activities FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can update daily activities"
ON public.daily_activities FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');

CREATE POLICY "Only approved account can delete daily activities"
ON public.daily_activities FOR DELETE TO authenticated
USING ((auth.jwt() ->> 'email') = 'ahmadarifrinaldi@gmail.com');