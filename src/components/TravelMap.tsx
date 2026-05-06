// ============================================================
// 地圖元件 - Leaflet + 高德地圖底圖（無需 API Key）
// 使用 WGS-84 → GCJ-02 坐標轉換，確保標記位置精準對齊高德底圖
// ============================================================
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTravelStore } from '../store/useTravelStore'
import { THEME, getCategoryColor } from '../theme'
import { ItineraryItem, Attraction } from '../types'
import { wgs84ToGcj02 } from '../lib/coordTransform'

// 修復 Leaflet 預設圖示路徑問題（Vite 打包後會找不到圖示）
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createColoredIcon(color: string, dayLabel: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: bold; color: white;
        font-family: 'Times New Roman', serif;
      ">${dayLabel.replace('Day ', '')}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

const CATEGORY_LABEL: Record<string, string> = {
  scenic: '景點',
  hotel: '酒店',
  restaurant: '餐廳',
}

function createPoolPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0 C5.373 0 0 5.373 0 12 C0 20 12 32 12 32 C12 32 24 20 24 12 C24 5.373 18.627 0 12 0 Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white" opacity="0.75"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  })
}

export default function TravelMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const poolMarkersRef = useRef<L.Marker[]>([])

  const days = useTravelStore((s) => s.days)
  const attractionPool = useTravelStore((s) => s.attractionPool)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: THEME.mapCenter,
      zoom: THEME.mapZoom,
      zoomControl: true,
    })

    // 高德地圖底圖（無需 API Key）
    L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      {
        subdomains: ['1', '2', '3', '4'],
        attribution: '© <a href="https://www.amap.com/" target="_blank">高德地圖</a>',
        maxZoom: 18,
      }
    ).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    const allPoints: [number, number][] = []

    days.forEach((day) => {
      day.items.forEach((item: ItineraryItem) => {
        if (item.lat == null || item.lng == null) return

        // WGS-84（Nominatim 回傳）→ GCJ-02（高德底圖坐標系），消除偏移
        const [gcjLat, gcjLng] = wgs84ToGcj02(item.lat, item.lng)

        const icon = createColoredIcon(day.color, day.label)
        const marker = L.marker([gcjLat, gcjLng], { icon }).addTo(map)

        const popupContent = `
          <div style="font-family:'SeparateSerif','Noto Serif SC','SimSun',serif; min-width:160px; max-width:220px;">
            <div style="background:${day.color}; color:white; padding:6px 10px; font-weight:bold; font-size:12px;">
              ${day.label}
            </div>
            <div style="padding:8px 10px;">
              <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${item.name}</div>
              ${item.time ? `<div style="color:#666; font-size:12px; margin-bottom:4px;">🕐 ${item.time}</div>` : ''}
              ${item.notes ? `<div style="color:#555; font-size:12px; margin-bottom:4px;">📝 ${item.notes}</div>` : ''}
              ${item.link ? `<div style="font-size:12px;"><a href="${item.link}" target="_blank" style="color:${THEME.primary};">🔗 查看攻略</a></div>` : ''}
            </div>
          </div>
        `
        marker.bindPopup(popupContent, { maxWidth: 240, className: 'travel-popup' })
        markersRef.current.push(marker)
        allPoints.push([gcjLat, gcjLng])
      })
    })

    if (allPoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 14 })
      } catch { /* 座標異常時靜默忽略 */ }
    }
  }, [days])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    poolMarkersRef.current.forEach((m) => m.remove())
    poolMarkersRef.current = []

    attractionPool.forEach((attraction: Attraction) => {
      if (attraction.lat == null || attraction.lng == null) return

      const [gcjLat, gcjLng] = wgs84ToGcj02(attraction.lat, attraction.lng)
      const color = getCategoryColor(attraction.category || 'scenic')
      const icon = createPoolPinIcon(color)
      const marker = L.marker([gcjLat, gcjLng], { icon }).addTo(map)

      const categoryLabel = CATEGORY_LABEL[attraction.category || 'scenic'] ?? '景點'
      const popupContent = `
        <div style="font-family:'SeparateSerif','Noto Serif SC','SimSun',serif; min-width:160px; max-width:220px;">
          <div style="background:${color}; color:white; padding:6px 10px; font-weight:bold; font-size:12px;">
            ${categoryLabel}
          </div>
          <div style="padding:8px 10px;">
            <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${attraction.name}</div>
            ${attraction.notes ? `<div style="color:#666; font-size:12px; margin-bottom:4px;">📍 ${attraction.notes}</div>` : ''}
            <div style="color:#A0B4BF; font-size:11px; font-family:'Times New Roman',serif; margin-top:4px;">
              ${attraction.lat.toFixed(5)}, ${attraction.lng.toFixed(5)}
            </div>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 240, className: 'travel-popup' })
      poolMarkersRef.current.push(marker)
    })
  }, [attractionPool])

  return (
    <div
      ref={mapContainerRef}
      style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}
    />
  )
}
