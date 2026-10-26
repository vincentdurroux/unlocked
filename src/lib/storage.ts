import { supabase } from './supabase';
import { compressImage } from '../services/imageService';

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

    let fileToUpload = file;

    // Automatically compress image if larger than 300KB
    if (file.type && file.type.startsWith('image/') && !file.type.includes('svg') && file.size > 300 * 1024) {
      try {
        fileToUpload = await compressImage(file, 0.6);
      } catch (e) {
        console.warn('[storageService] Initial image compression skipped or failed:', e);
      }
    }

    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(sanitizedPath, fileToUpload, {
        cacheControl: '3600',
        upsert: true
      });

    // If upload fails with size limit error, attempt emergency high compression retry
    if (error && (error.message?.includes('exceeded the maximum allowed size') || (error as any).statusCode === '413')) {
      console.warn('[storageService] Exceeded max allowed size on Supabase. Attempting emergency heavy compression...');
      try {
        const ultraCompressed = await compressImage(file, 0.25);
        const retryResult = await supabase.storage
          .from(bucket)
          .upload(sanitizedPath, ultraCompressed, {
            cacheControl: '3600',
            upsert: true
          });
        data = retryResult.data;
        error = retryResult.error;
      } catch (retryErr) {
        console.error('[storageService] Retry after emergency compression failed:', retryErr);
      }
    }

    if (error) {
      if (error.message?.includes('exceeded the maximum allowed size')) {
        throw new Error('The image file size exceeds the storage bucket limit. Please select a smaller photo or lower resolution image.');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Upload failed: no response data received from storage.');
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
