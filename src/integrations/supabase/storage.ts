import { supabase } from "./client";

// Removed BUCKET_NAME, uploadImage, deleteImage, getPathFromPublicUrl as they are no longer needed.
// The storage client itself remains available via 'supabase' import if needed for other purposes.