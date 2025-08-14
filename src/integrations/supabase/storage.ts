import { supabase } from "./client";

export const BUCKET_NAME = "room_images"; // Define a bucket for room images

export const uploadImage = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }
  return data;
};

export const deleteImage = async (path: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw error;
  }
  return data;
};

export const getPathFromPublicUrl = (publicUrl: string) => {
  // Example publicUrl: https://[project_id].supabase.co/storage/v1/object/public/room_images/path/to/image.png
  const parts = publicUrl.split('/');
  // Find the index of 'room_images' and take subsequent parts
  const bucketIndex = parts.indexOf(BUCKET_NAME);
  if (bucketIndex === -1) {
    return null; // Not a URL from this bucket
  }
  return parts.slice(bucketIndex + 1).join('/');
};

export const getPublicImageUrl = (path: string) => {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};