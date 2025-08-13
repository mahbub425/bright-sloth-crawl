-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  pin TEXT UNIQUE,
  phone TEXT,
  email TEXT UNIQUE, -- Storing email here for easier querying with RLS, though auth.users also has it
  department TEXT,
  designation TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  status TEXT DEFAULT 'active', -- 'active' or 'blocked'
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
-- Users can only select their own profile
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- Users can only insert their own profile (handled by trigger, but good to have for direct inserts if needed)
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Users can only delete their own profile
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);

-- Super Admins can select all profiles
CREATE POLICY "profiles_admin_select_all" ON public.profiles
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Super Admins can insert profiles
CREATE POLICY "profiles_admin_insert" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Super Admins can update all profiles
CREATE POLICY "profiles_admin_update_all" ON public.profiles
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Super Admins can delete all profiles
CREATE POLICY "profiles_admin_delete_all" ON public.profiles
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- Create function to insert profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, pin, phone, email, department, designation, role, status)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'pin',
    new.raw_user_meta_data ->> 'phone',
    new.email, -- Use new.email directly from auth.users
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'designation',
    'user', -- Default role for new sign-ups
    'active' -- Default status for new sign-ups
  );
  RETURN new;
END;
$$;

-- Trigger the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();