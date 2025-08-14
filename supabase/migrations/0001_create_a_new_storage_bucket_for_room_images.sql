INSERT INTO storage.buckets (id, name, public)
VALUES ('room_images', 'room_images', true)
ON CONFLICT (id) DO NOTHING;