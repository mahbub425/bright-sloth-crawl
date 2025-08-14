ALTER TABLE public.bookings
ADD CONSTRAINT fk_bookings_user_id
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;