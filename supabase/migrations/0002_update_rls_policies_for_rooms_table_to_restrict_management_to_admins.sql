-- Update INSERT policy for rooms to require admin role
DROP POLICY IF EXISTS "Admins can insert rooms" ON public.rooms;
CREATE POLICY "Admins can insert rooms" ON public.rooms
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Update UPDATE policy for rooms to require admin role
DROP POLICY IF EXISTS "Admins can update rooms" ON public.rooms;
CREATE POLICY "Admins can update rooms" ON public.rooms
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Update DELETE policy for rooms to require admin role
DROP POLICY IF EXISTS "Admins can delete rooms" ON public.rooms;
CREATE POLICY "Admins can delete rooms" ON public.rooms
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));