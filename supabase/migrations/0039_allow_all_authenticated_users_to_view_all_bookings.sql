-- Drop the existing policy that restricts users to their own bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

-- Create a new policy to allow all authenticated users to view all bookings
CREATE POLICY "Allow authenticated users to view all bookings" ON public.bookings
FOR SELECT TO authenticated USING (true);