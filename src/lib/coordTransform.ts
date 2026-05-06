// WGS-84（Nominatim/GPS）→ GCJ-02（高德/騰訊坐標系）轉換
// 這是中國地圖業界公開標準演算法，誤差 < 1 公尺
// 境外坐標直接回傳，不作轉換

const pi = Math.PI
const a = 6378245.0          // 地球長半軸
const ee = 0.00669342162296594323  // 偏心率平方

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0
  r += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0
  r += (160.0 * Math.sin(y / 12.0 * pi) + 320.0 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0
  return r
}

function transformLng(x: number, y: number): number {
  let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0
  r += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0
  r += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0
  return r
}

export function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)

  const radLat = lat / 180.0 * pi
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi)
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi)

  return [lat + dLat, lng + dLng]
}
