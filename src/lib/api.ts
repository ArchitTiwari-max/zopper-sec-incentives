import { API_BASE_URL } from './config'

export interface Store {
  id: string
  storeName: string
  city: string
}

export interface SamsungSKU {
  id: string
  Category: string
  ModelName: string
}

export interface Plan {
  id: string
  planType: 'Screen_Protect_1_Yr' | 'ADLD_1_Yr' | 'Combo_2Yrs' | 'Extended_Warranty_1_Yr'
  price: number
  samsungSKU?: {
    id: string
    Category: string
    ModelName: string
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  count?: number
  message?: string
  error?: string
}

/**
 * Generic API call function with error handling
 */
async function apiCall<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    return {
      success: false,
      data: [] as T,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fetch all stores from the API
 */
export async function fetchStores(): Promise<ApiResponse<Store[]>> {
  return apiCall<Store[]>('/stores')
}

/**
 * Fetch all Samsung SKUs from the API
 */
export async function fetchSamsungSKUs(): Promise<ApiResponse<SamsungSKU[]>> {
  return apiCall<SamsungSKU[]>('/samsung-skus')
}

/**
 * Fetch plans for a specific Samsung SKU
 */
export async function fetchPlansForSKU(skuId: string): Promise<ApiResponse<Plan[]>> {
  return apiCall<Plan[]>(`/samsung-skus/${skuId}/plans`)
}

/**
 * Fetch all plans from the API
 */
export async function fetchAllPlans(): Promise<ApiResponse<Plan[]>> {
  return apiCall<Plan[]>('/plans')
}

/**
 * Get plan price for specific SKU and plan type
 */
export async function fetchPlanPrice(skuId: string, planType: string): Promise<ApiResponse<Plan>> {
  return apiCall<Plan>(`/plan-price?skuId=${encodeURIComponent(skuId)}&planType=${encodeURIComponent(planType)}`)
}

/**
 * Format plan type for display
 */
export function formatPlanType(planType: string): string {
  const planTypeMap: Record<string, string> = {
    'Screen_Protect_1_Yr': 'Screen Protection (1 Year)',
    'ADLD_1_Yr': 'ADLD (1 Year)',
    'Combo_2Yrs': 'Combo Plan (2 Years)',
    'Extended_Warranty_1_Yr': 'Extended Warranty (1 Year)'
  }
  
  return planTypeMap[planType] || planType
}

/**
 * Format price with rupee symbol
 */
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`
}