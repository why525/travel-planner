// ============================================================
// 高德地圖 API 跨域代理（Vercel Serverless Function）
// 職責：
//   1. 回應 AMap JSAPI 安全密鑰查詢（/_AMapSecurityConfig）
//   2. 代理 AMap REST API 請求，Key 保存於伺服器端環境變數
// 環境變數：
//   AMAP_KEY            高德地圖 Web 服務 API Key（不帶 VITE_ 前綴）
//   AMAP_SECURITY_CODE  高德地圖安全密鑰（不帶 VITE_ 前綴）
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const rawUrl = req.url || ''
  const parsed = new URL(rawUrl, 'https://placeholder')

  // ── AMap JSAPI 安全密鑰端點 ──────────────────────────────
  // AMap SDK 在 serviceHost 模式下會請求 <serviceHost>/_AMapSecurityConfig
  if (parsed.pathname === '/_AMapSecurityConfig') {
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({
      _AMapSecurityConfig: {
        securityJsCode: process.env.AMAP_SECURITY_CODE || '',
      },
    })
  }

  // ── AMap REST API 代理 ───────────────────────────────────
  // 用法：/api/amap-proxy?path=/v3/geocode/geo&address=上海
  const amapKey = process.env.AMAP_KEY
  if (!amapKey) {
    return res.status(500).json({ status: '0', info: 'AMAP_KEY not configured' })
  }

  const apiPath = parsed.searchParams.get('path') || ''
  if (!apiPath) {
    return res.status(400).json({ status: '0', info: 'Missing required param: path' })
  }

  const targetUrl = new URL(`https://restapi.amap.com${apiPath}`)
  targetUrl.searchParams.set('key', amapKey)
  for (const [k, v] of parsed.searchParams) {
    if (k !== 'path') targetUrl.searchParams.set(k, v)
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: { 'User-Agent': 'TravelPlanner-Proxy/1.0' },
    })
    const body = await upstream.text()
    res.setHeader('Content-Type', 'application/json')
    return res.status(upstream.status).send(body)
  } catch {
    return res.status(502).json({ status: '0', info: 'Upstream request failed' })
  }
}
