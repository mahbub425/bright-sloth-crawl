CREATE POLICY "Admins can insert rooms" ON public.rooms
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));