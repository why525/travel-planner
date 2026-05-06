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
    if (import.meta.env.DEV) {
      // 本地開發：直接帶入安全密鑰（local-cors-proxy 不支援 serviceHost 模式）
      const secCode = import.meta.env.VITE_AMAP_SECURITY_CODE
      if (secCode) {
        ;(window as Record<string, unknown>)._AMapSecurityConfig = { securityJsCode: secCode }
      }
    } else {
      // 線上部署：永遠設定 serviceHost，讓 SDK 向 /_AMapSecurityConfig 取得安全密鑰
      // Vercel rewrites 將該路徑代理到 /api/amap-proxy，密鑰由伺服器端 AMAP_SECURITY_CODE 回傳
      ;(window as Record<string, unknown>)._AMapSecurityConfig = { serviceHost: '' }
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
