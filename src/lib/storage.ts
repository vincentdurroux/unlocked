import { supabase } from './supabase';

export const storageService = {
  /**
   * Upload a file to a Supabase bucket
   * @param bucket The name of the bucket (e.g., 'images')
   * @param path The path inside the bucket (e.g., 'ads/my-image.jpg')
   * @param file The file object from an input type="file"
   */
  async uploadFile(bucket: string, path: string, file: File) {
    // Sanitize the path to avoid "Invalid key" errors with special characters
    const sanitizedPath = path
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9./_-]/g, '_')
      .replace(/_{2,}/g, '_');

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(sanitizedPath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  },

  /**
   * Delete a file from a Supabase bucket
   * @param bucket The name of the bucket
   * @param path The full path including subfolders
   */
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.warn('Error deleting file from storage:', error);
      // We don't throw here to avoid breaking the main flow if deletion fails
    }
  },

  /**
   * Helper to extract the path from a Supabase storage URL for the avatars bucket
   */
  getAvatarPathFromUrl(url: string) {
    try {
      const cleanUrl = url.split('?')[0];
      
      if (cleanUrl.includes('/storage/v1/object/public/avatars/')) {
        const parts = cleanUrl.split('/storage/v1/object/public/avatars/');
        return parts[parts.length - 1];
      } else if (cleanUrl.includes('/public/avatars/')) {
        const parts = cleanUrl.split('/public/avatars/');
        return parts[parts.length - 1];
      } else if (cleanUrl.includes('/avatars/avatars/')) {
        const parts = cleanUrl.split('/avatars/avatars/');
        return 'avatars/' + parts[parts.length - 1];
      } else if (cleanUrl.includes('/avatars/')) {
        const parts = cleanUrl.split('/avatars/');
        if (parts[parts.length - 1]) {
          return 'avatars/' + parts[parts.length - 1];
        }
      } else if (cleanUrl.startsWith('avatars/')) {
        return cleanUrl;
      } else if (!cleanUrl.includes('/') && !cleanUrl.startsWith('http')) {
        return 'avatars/' + cleanUrl;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
