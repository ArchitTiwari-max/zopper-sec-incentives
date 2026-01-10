/**
 * Utility functions for handling video URLs and thumbnails with S3
 */

import { API_BASE_URL } from '@/lib/config';

// Cache for signed URLs to avoid repeated requests
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get a signed URL for viewing a video (for private S3 buckets)
 */
export const getSignedVideoUrl = async (originalUrl: string): Promise<string> => {
  if (!originalUrl) return '';

  // Check if it's an S3 URL
  const isS3 = originalUrl.includes('.s3.') || originalUrl.includes('amazonaws.com');
  
  // If not S3, return as-is (e.g., ImageKit)
  if (!isS3) {
    return originalUrl;
  }

  // Check cache first
  const cached = signedUrlCache.get(originalUrl);
  if (cached && cached.expiresAt > Date.now() + 60000) { // Refresh if less than 1 min left
    return cached.url;
  }

  // Request signed URL from backend
  try {
    const response = await fetch(`${API_BASE_URL}/signed-video-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: originalUrl }),
    });

    const data = await response.json();
    
    if (data.success && data.signedUrl) {
      // Cache the signed URL
      signedUrlCache.set(originalUrl, {
        url: data.signedUrl,
        expiresAt: data.expiresAt,
      });
      return data.signedUrl;
    }
    
    // Fallback to original URL if signing fails
    return originalUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return originalUrl;
  }
};

/**
 * Get thumbnail URL for a video
 * For S3 videos with generated thumbnails, use the JPG thumbnail
 * For ImageKit URLs (during migration), maintain compatibility
 * Fallback to video URL if no thumbnail available
 */
export const getThumbnailUrl = (url: string, thumbnailUrl?: string): string => {
  if (!url) return '';

  // If we have a specific thumbnail URL and it's different from video URL, use it
  if (thumbnailUrl && thumbnailUrl !== url) {
    return thumbnailUrl;
  }

  // For ImageKit URLs, use ImageKit's thumbnail transformation
  if (isImageKitUrl(url)) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tr=w-400,h-225,q-80,f-jpg`;
  }

  // For S3 URLs without thumbnail, return the video URL as fallback
  // (will be handled by onError in the component)
  return url;
};

/**
 * Get optimized video URL for playback
 * For S3 URLs, return as-is since they're already optimized MP4
 * For ImageKit URLs (during migration), return as-is (ImageKit handles optimization)
 */
export const getOptimizedVideoUrl = (url: string): string => {
  if (!url) return '';

  // For ImageKit URLs, append transformation to force MP4 format
  // This helps bypass "transformation limit exceeded" errors for plain MP4 links
  if (isImageKitUrl(url)) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tr=f-mp4`;
  }

  // Return URL as-is for S3 and others
  return url;
};

/**
 * Generate a thumbnail from a video element using canvas
 * This can be used to create thumbnails for S3 videos client-side
 */
export const generateVideoThumbnail = (videoElement: HTMLVideoElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas size to video dimensions
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      // Draw the current frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if a URL is an S3 URL
 */
export const isS3Url = (url: string): boolean => {
  return url.includes('.s3.') || url.includes('amazonaws.com');
};

/**
 * Check if a URL is an ImageKit URL
 */
export const isImageKitUrl = (url: string): boolean => {
  return url.includes('ik.imagekit.io');
};

/**
 * Get video format info from URL
 */
export const getVideoFormat = (url: string): { isOptimized: boolean; source: 'S3' | 'ImageKit' | 'Unknown' } => {
  if (isS3Url(url)) {
    return { isOptimized: true, source: 'S3' };
  }

  if (isImageKitUrl(url)) {
    return { isOptimized: false, source: 'ImageKit' };
  }

  return { isOptimized: false, source: 'Unknown' };
};