CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'room_images');