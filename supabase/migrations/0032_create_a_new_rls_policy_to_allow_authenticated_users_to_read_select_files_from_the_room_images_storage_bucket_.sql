CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'room_images');