// ============================================================
// 高德地圖 AMap JSAPI 單例載入器
// 注意：_AMapSecurityConfig 只在有安全密鑰時才設定
//       舊版 Key（2021/12/02 前申請）不需要安全密鑰
// ============================================================
import AMapLoader from '@amap/amap-jsapi-loader'

let amapPromise: Promise<unknown> | null = null

export function getAMap(): Promise<unknown> {
  if (!amapPromise) {
    const secCode = import.meta.env.VITE_AMAP_SECURITY_CODE
    // 只有在明確提供安全密鑰時才設定，避免空字串干擾舊版 Key 授權
    if (secCode) {
      (window as Record<string, unknown>)._AMapSecurityConfig = {
        securityJsCode: secCode,
      }
    }

    amapPromise = AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.Geocoder'],
    }).catch((err) => {
      console.error('[AMap] 載入失敗：', err)
      amapPromise = null
      throw err
    })
  }
  return amapPromise
}
