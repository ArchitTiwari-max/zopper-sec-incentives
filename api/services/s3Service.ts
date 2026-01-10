import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadUrlResponse {
  uploadUrl: string;
  finalFileUrl: string;
  expiresAt: number;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresAt: number;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    // Validate required environment variables
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    this.region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'Missing required AWS configuration. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in .env'
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generate a pre-signed URL for uploading a file to S3
   */
  async generateUploadUrl(
    userId: string,
    filename: string,
    mimeType: string
  ): Promise<UploadUrlResponse> {
    // Generate timestamp for unique file naming
    const timestamp = Date.now();
    
    // Sanitize filename
    let sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Determine file extension based on mime type
    let extension = '.mp4'; // Default for videos
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = '.jpg';
    } else if (mimeType === 'image/png') {
      extension = '.png';
    }
    
    // Remove existing extension and add the correct one
    sanitizedFilename = sanitizedFilename.replace(/\.[^.]+$/, '') + extension;
    
    // Create S3 key with format: videos/{userId}/{timestamp}-{filename}
    const s3Key = `videos/${userId}/${timestamp}-${sanitizedFilename}`;

    // Create the put object command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: mimeType, // Use the provided mime type
    });

    // Generate pre-signed URL with 60-second expiry
    const expiresIn = 60; // 60 seconds
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    // Generate the final public URL
    const finalFileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

    return {
      uploadUrl,
      finalFileUrl,
      expiresAt: Date.now() + (expiresIn * 1000),
    };
  }

  /**
   * Generate a signed GET URL for viewing a video from S3
   */
  async generateViewUrl(s3Key: string): Promise<SignedUrlResponse> {
    // Create the get object command
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    // Generate pre-signed URL with 1 hour expiry
    const expiresIn = 3600; // 1 hour
    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    return {
      signedUrl,
      expiresAt: Date.now() + (expiresIn * 1000),
    };
  }

  /**
   * Extract S3 key from a full S3 URL
   */
  extractS3Key(url: string): string | null {
    try {
      // Handle format: https://bucket.s3.region.amazonaws.com/key
      const match = url.match(/amazonaws\.com\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if S3 service is properly configured
   */
  isConfigured(): boolean {
    try {
      return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_S3_BUCKET_NAME
      );
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const s3Service = new S3Service();