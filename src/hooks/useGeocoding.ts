// ============================================================
// 地理編碼 Hook - 把景點名稱轉成地圖座標
// 使用 Nominatim（OSM，免費無需 Key），回傳 WGS-84
// 結果套用 WGS-84 → GCJ-02 轉換，確保在高德底圖上位置精準
// ============================================================
import { useState, useCallback } from 'react'
import { wgs84ToGcj02 } from '../lib/coordTransform'

export interface GeoResult {
  lat: number
  lng: number
  address: string
  displayName: string
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

interface GeocodingState {
  loading: boolean
  error: string | null
}

interface UseGeocodingReturn extends GeocodingState {
  geocode: (query: string, countryHint?: string) => Promise<GeoResult | null>
}

export function useGeocoding(): UseGeocodingReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocode = useCallback(async (
    query: string,
    countryHint?: string
  ): Promise<GeoResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const searchQuery = countryHint ? `${query}, ${countryHint}` : query
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(searchQuery)}`

      const response = await fetch(url, {
        headers: { 'User-Agent': 'TravelPlanner/1.0 (educational use)' },
      })

      if (!response.ok) throw new Error(`搜尋失敗：HTTP ${response.status}`)

      const results: NominatimResult[] = await response.json()
      if (results.length === 0) {
        setError(`找不到「${query}」的位置`)
        return null
      }

      const r = results[0]
      const wgsLat = parseFloat(r.lat)
      const wgsLng = parseFloat(r.lon)

      // WGS-84 → GCJ-02，讓標記精準對齊高德底圖
      const [gcjLat, gcjLng] = wgs84ToGcj02(wgsLat, wgsLng)

      return {
        lat: gcjLat,
        lng: gcjLng,
        address: r.display_name,
        displayName: r.display_name.split(',').slice(0, 3).join(',').trim(),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '網路錯誤，請稍後再試'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, geocode }
}
