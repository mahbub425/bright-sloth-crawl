-- Drop existing policies for room_images bucket to ensure a clean slate
DROP POLICY IF EXISTS "Allow authenticated users to upload room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects; -- Drop the policy from the previous attempt if it was created

-- Create policy to allow authenticated users to upload (insert) files into the room_images bucket
CREATE POLICY "Allow authenticated users to upload room images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room_images');

-- Create policy to allow authenticated users to read (select) files from the room_images bucket
CREATE POLICY "Allow authenticated users to read room images" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'room_images');

-- Create policy to allow authenticated users to delete (remove) files from the room_images bucket
CREATE POLICY "Allow authenticated users to delete room images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'room_images');