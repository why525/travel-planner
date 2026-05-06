// ============================================================
// 高德地圖 AMap JSAPI 單例載入器
// 注意：_AMapSecurityConfig 只在有安全密鑰時才設定
//       舊版 Key（2021/12/02 前申請）不需要安全密鑰
// ============================================================
import AMapLoader from '@amap/amap-jsapi-loader'

// 代理端點：本地使用 local-cors-proxy，線上使用 Vercel serverless function
// 本地開發請執行：npx local-cors-proxy --proxyUrl https://restapi.amap.com --port 8010
export const AMAP_PROXY_BASE = import.meta.env.DEV
  ? 'http://localhost:8010/proxy'
  : '/api/amap-proxy'

let amapPromise: Promise<unknown> | null = null

export function getAMap(): Promise<unknown> {
  if (!amapPromise) {
    const secCode = import.meta.env.VITE_AMAP_SECURITY_CODE
    // 只有在明確提供安全密鑰時才設定，避免空字串干擾舊版 Key 授權
    if (secCode) {
      // 本地開發：直接使用安全密鑰（local-cors-proxy 不支援 serviceHost 模式）
      // 線上部署：serviceHost 指向同源代理，安全密鑰由 Vercel 環境變數提供，不暴露於客戶端
      ;(window as Record<string, unknown>)._AMapSecurityConfig = import.meta.env.DEV
        ? { securityJsCode: secCode }
        : { serviceHost: '' }
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
