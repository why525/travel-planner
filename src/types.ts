// ============================================================
// 型別定義檔
// ============================================================

export type ItemCategory = 'scenic' | 'hotel' | 'restaurant'

// 交通方式：前往下一站的方式
export type TransportMode = 'walk' | 'taxi' | 'subway' | 'bus' | 'car' | 'ferry' | ''

export interface Attraction {
  id: string
  name: string
  time?: string
  lat?: number
  lng?: number
  address?: string
  notes?: string
  link?: string
  category?: ItemCategory
}

export interface ItineraryItem {
  id: string
  name: string
  time: string
  notes: string
  link: string
  lat?: number
  lng?: number
  address?: string
  isDefault?: boolean
  category: ItemCategory
  // 前往下一站的交通資訊（選填）
  transportMode?: TransportMode   // 交通方式（步行/計程車/地鐵…）
  transport?: string              // 交通說明，例如「步行 10 分鐘」
}

export interface Day {
  id: string
  label: string
  date: string
  color: string
  items: ItineraryItem[]
}

export interface TravelPlan {
  destination: string
  attractionPool: Attraction[]
  days: Day[]
}
