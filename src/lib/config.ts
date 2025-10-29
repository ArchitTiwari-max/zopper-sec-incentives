// API configuration for different environments
export const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Production - use relative URLs (Vercel will handle routing)
  : 'http://localhost:3001/api'  // Development - use localhost

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
