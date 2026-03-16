// API configuration for different environments
export const API_BASE_URL = '/api'  // Always use relative URLs - Vite proxy handles dev, Vercel handles prod

export const config = {
  apiUrl: API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  cloudinary: {
    cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || '',
    uploadPreset: (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) || '',
    folder: ((import.meta.env.VITE_CLOUDINARY_FOLDER as string) || 'proctoring').replace(/\/$/, ''),
    // Optional signed flow (not required if using unsigned preset)
    signed: String(import.meta.env.VITE_CLOUDINARY_SIGNED || '').toLowerCase() === 'true',
    signatureUrl: (import.meta.env.VITE_CLOUDINARY_SIGNATURE_URL as string) || '/api/cloudinary-signature',
  },
}
