import { supabase } from "./client";

const BUCKET_NAME = "room-images"; // Define your storage bucket name

export const uploadImage = async (file: File, path: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.error("Error uploading image:", error.message);
    return null;
  }
};

export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      throw error;
    }
    return true;
  } catch (error: any) {
    console.error("Error deleting image:", error.message);
    return false;
  }
};

// Function to extract path from public URL
export const getPathFromPublicUrl = (publicUrl: string): string | null => {
  const parts = publicUrl.split(`${BUCKET_NAME}/`);
  if (parts.length > 1) {
    return parts[1];
  }
  return null;
};