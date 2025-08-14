CREATE POLICY "Allow service role to insert profiles" ON public.profiles
FOR INSERT TO service_role WITH CHECK (true);