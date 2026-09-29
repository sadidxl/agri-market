import { apiUpload } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUrl';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const validateImageFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG, WEBP, or GIF image.';
  }
  if (file.size > MAX_SIZE) {
    return 'Image must be smaller than 5MB.';
  }
  return null;
};

export const uploadImage = async (file) => apiUpload('/upload/image', file);

// Re-exported for convenience so pages only need one import for "give me a
// displayable URL for this image path".
export const resolveUploadedUrl = getImageUrl;
