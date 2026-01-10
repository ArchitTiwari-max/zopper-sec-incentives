import { API_BASE_URL } from '@/lib/config';

export interface UploadUrlResponse {
  uploadUrl: string;
  finalFileUrl: string;
  expiresAt: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class UploadManager {
  /**
   * Request a pre-signed upload URL from the backend
   */
  async requestUploadUrl(filename: string, mimeType: string): Promise<UploadUrlResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename,
        mimeType
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload URL request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get upload URL');
    }

    return {
      uploadUrl: data.uploadUrl,
      finalFileUrl: data.finalFileUrl,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Upload file to S3 using pre-signed URL
   */
  async uploadToS3(
    file: Blob,
    uploadUrl: string,
    mimeType: string,
    onProgress: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      // Start upload
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType); // Use the provided mime type
      xhr.send(file);
    });
  }

  /**
   * Upload with automatic retry on URL expiration
   */
  async uploadWithRetry(
    file: Blob,
    filename: string,
    mimeType: string,
    onProgress: (progress: UploadProgress) => void,
    maxRetries: number = 2
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get fresh upload URL for each attempt
        const { uploadUrl, finalFileUrl, expiresAt } = await this.requestUploadUrl(filename, mimeType);

        // Check if URL is already expired
        if (Date.now() >= expiresAt) {
          throw new Error('Upload URL expired before upload could start');
        }

        // Attempt upload
        await this.uploadToS3(file, uploadUrl, mimeType, onProgress);
        
        // Success!
        return finalFileUrl;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown upload error');
        
        // Don't retry on authentication errors
        if (lastError.message.includes('401') || lastError.message.includes('Authentication')) {
          throw lastError;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Upload failed after all retry attempts');
  }

  /**
   * Save video metadata to database
   */
  async saveVideoMetadata(videoData: {
    url: string;
    fileName: string;
    title: string;
    description: string;
    fileSize?: number;
    thumbnailUrl?: string;
  }, userId?: string): Promise<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Get current user ID from parameter or localStorage
    const currentUserId = userId || localStorage.getItem('currentUserId');
    if (!currentUserId) {
      throw new Error('User ID not found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        secUserId: currentUserId,
        url: videoData.url,
        fileName: videoData.fileName,
        title: videoData.title,
        description: videoData.description,
        fileSize: videoData.fileSize,
        thumbnailUrl: videoData.thumbnailUrl,
        tags: ['pitch-sultan', 'battle']
        // Note: No fileId for S3 uploads (only ImageKit had fileId)
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to save video metadata: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to save video metadata');
    }

    return result.data;
  }
}

// Hook for using UploadManager in React components
export const useUploadManager = () => {
  const uploadManager = new UploadManager();

  return {
    requestUploadUrl: uploadManager.requestUploadUrl.bind(uploadManager),
    uploadToS3: uploadManager.uploadToS3.bind(uploadManager),
    uploadWithRetry: uploadManager.uploadWithRetry.bind(uploadManager),
    saveVideoMetadata: (videoData: any, userId?: string) => uploadManager.saveVideoMetadata(videoData, userId)
  };
};