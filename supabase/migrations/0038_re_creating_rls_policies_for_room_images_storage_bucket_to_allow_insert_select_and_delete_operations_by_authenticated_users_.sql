-- Drop all policies on storage.objects that might be related to room_images
DROP POLICY IF EXISTS "Allow authenticated users to upload room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete room images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
DROP POLICY IF EXISTS "policy_name_insert" ON storage.objects;
DROP POLICY IF EXISTS "policy_name_select" ON storage.objects;
DROP POLICY IF EXISTS "policy_name_delete" ON storage.objects;

-- Re-create the necessary policies for room_images bucket with new names
CREATE POLICY "room_images_insert_policy" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room_images');

CREATE POLICY "room_images_select_policy" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'room_images');

CREATE POLICY "room_images_delete_policy" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'room_images');