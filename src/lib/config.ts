// API configuration for different environments
export const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Production - use relative URLs (Vercel will handle routing)
  : 'http://localhost:3001/api'  // Development - use localhost

export const config = {
  apiUrl: API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}
