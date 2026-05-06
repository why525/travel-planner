// ============================================================
// 左側景點池元件
// 新增景點：POI 聯想搜尋下拉（必須手動選取）+ 手動輸入經緯度
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useTravelStore } from '../store/useTravelStore'
import { THEME, getCategoryColor } from '../theme'
import { Attraction, ItemCategory } from '../types'
import gcoord from 'gcoord'
import { AMAP_PROXY_BASE } from '../lib/amapLoader'

// ── POI 候選型別 ──────────────────────────────────────────────
interface PoiCandidate {
  displayName: string  // 景點名稱（第一段）
  address: string      // 詳細地址（後段）
  lat: number          // GCJ-02 緯度
  lng: number          // GCJ-02 經度
}

// 本地開發時直接帶 Key（local-cors-proxy 純轉發）；
// 線上部署時不帶 Key，由 Vercel Serverless Function 從環境變數注入
const AMAP_DEV_KEY = 'c5cc58440d3081d87eec659c742fb908'

interface AmapTip {
  name: string
  address: string | string[]  // 無地址時高德回傳 []
  location: string             // "lng,lat"，GCJ-02，無需轉換
  district: string
}
interface AmapTipsResponse {
  status: string
  tips: AmapTip[]
}

// 呼叫高德 POI 聯想接口（inputtips），透過代理避免跨域
async function fetchPoiCandidates(query: string, cityHint?: string): Promise<PoiCandidate[]> {
  let url: string
  if (import.meta.env.DEV) {
    // 本地：local-cors-proxy 純轉發，需自帶 Key
    const params = new URLSearchParams({ keywords: query, key: AMAP_DEV_KEY, output: 'json' })
    if (cityHint) params.set('city', cityHint)
    url = `${AMAP_PROXY_BASE}/v3/assistant/inputtips?${params}`
  } else {
    // 線上：Vercel Serverless Function 注入 Key，path 參數指定高德端點
    const params = new URLSearchParams({ path: '/v3/assistant/inputtips', keywords: query, output: 'json' })
    if (cityHint) params.set('city', cityHint)
    url = `${AMAP_PROXY_BASE}?${params}`
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data: AmapTipsResponse = await res.json()
    if (data.status !== '1' || !Array.isArray(data.tips)) return []
    return data.tips
      .filter((t) => typeof t.location === 'string' && t.location.includes(','))
      .map((t) => {
        const [lngStr, latStr] = t.location.split(',')
        const gcjLng = parseFloat(lngStr)
        const gcjLat = parseFloat(latStr)
        // 高德回傳 GCJ-02，轉回 WGS-84 供 Leaflet 使用
        const [wgsLng, wgsLat] = gcoord.transform([gcjLng, gcjLat], gcoord.GCJ02, gcoord.WGS84)
        const address = Array.isArray(t.address) ? (t.district || '') : (t.address || t.district || '')
        return {
          displayName: t.name,
          address,
          lat: wgsLat,
          lng: wgsLng,
        }
      })
      .slice(0, 5)
  } catch {
    return []
  }
}

// ── 景點卡片（拖曳用）─────────────────────────────────────────
function AttractionCard({ attraction, onRemove }: { attraction: Attraction; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${attraction.id}`,
    data: { type: 'pool-item', attractionId: attraction.id },
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.42 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        background: 'rgba(255,255,255,0.8)',
        border: `1px solid ${THEME.borderLight}`,
        borderLeft: `4px solid ${getCategoryColor(attraction.category || 'scenic')}`,
        borderRadius: '14px',
        padding: '10px 12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: isDragging ? '0 14px 28px rgba(33,70,90,0.12)' : 'none',
        backdropFilter: 'blur(8px)',
      }}
      {...listeners} {...attributes}
    >
      <span style={{ color: THEME.textMuted, fontSize: '14px', flexShrink: 0 }}>⠿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: THEME.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attraction.name}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(attraction.id) }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#B9C8D1', fontSize: '16px', padding: '2px 4px', borderRadius: '6px', lineHeight: 1, flexShrink: 0 }}
      >×</button>
    </div>
  )
}

// ── 景點詳情編輯 Modal ────────────────────────────────────────
function AttractionDetailModal({
  attraction, onClose, onSave,
}: {
  attraction: Attraction | null
  onClose: () => void
  onSave: (id: string, updates: Partial<Attraction>) => void
}) {
  const [name, setName] = useState('')
  const [coords, setCoords] = useState('')
  const [notes, setNotes] = useState('')
  const [link, setLink] = useState('')

  useEffect(() => {
    if (!attraction) return
    setName(attraction.name ?? '')
    setCoords(attraction.lat != null && attraction.lng != null ? `${attraction.lat},${attraction.lng}` : '')
    setNotes(attraction.notes ?? '')
    setLink(attraction.link ?? '')
  }, [attraction])

  function handleSave() {
    const parts = coords.trim().split(',').map(p => p.trim())
    if (parts.length !== 2) return
    const lat = Number(parts[0]); const lng = Number(parts[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!attraction) return
    onSave(attraction.id, { name: name.trim(), lat, lng, notes: notes.trim(), link: link.trim() })
    onClose()
  }

  if (!attraction) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '18px', padding: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: THEME.textPrimary }}>編輯詳情</div>
          <button onClick={onClose} style={{ border: 'none', background: '#F3F5F6', borderRadius: '999px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px', color: THEME.textMuted }}>×</button>
        </div>
        <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="景點名稱" style={inputStyle} />
          <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="經緯度：36.0582,120.3425" style={inputStyle} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="攻略連結" style={inputStyle} />
          <button onClick={handleSave} style={primaryBtnStyle}>儲存</button>
        </div>
      </div>
    </div>
  )
}

// ── 共用樣式常數 ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: `1px solid ${THEME.border}`, borderRadius: '12px',
  fontSize: '13px', outline: 'none',
  background: 'rgba(255,255,255,0.9)', fontFamily: 'inherit',
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 14px', border: 'none', borderRadius: '12px',
  background: THEME.primary, color: 'white',
  cursor: 'pointer', fontSize: '14px', fontWeight: 700,
}

// ── 主元件 ────────────────────────────────────────────────────
export default function AttractionPool() {
  const attractionPool  = useTravelStore((s) => s.attractionPool)
  const destination     = useTravelStore((s) => s.destination)
  const addAttraction   = useTravelStore((s) => s.addAttraction)
  const removeAttraction = useTravelStore((s) => s.removeAttraction)

  // 表單開關
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [inputCategory, setInputCategory] = useState<ItemCategory>('scenic')

  // Mode 1：POI 聯想搜尋
  const [inputName, setInputName] = useState('')
  const [suggestions, setSuggestions] = useState<PoiCandidate[]>([])
  const [selectedPoi, setSelectedPoi] = useState<PoiCandidate | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Mode 2：手動經緯度
  const [inputCoords, setInputCoords] = useState('')

  // 附加資訊
  const [inputNotes, setInputNotes] = useState('')
  const [inputLink, setInputLink] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 點擊空白收起下拉
  const searchWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Debounce 搜尋（400ms）
  useEffect(() => {
    if (selectedPoi) return  // 已選取，不再搜尋
    const trimmed = inputName.trim()
    if (trimmed.length < 2) { setSuggestions([]); setShowDropdown(false); return }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await fetchPoiCandidates(trimmed, destination)
      setSuggestions(results)
      setShowDropdown(results.length > 0)
      setIsSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [inputName, destination, selectedPoi])

  // 名稱輸入變更
  function handleNameChange(value: string) {
    setInputName(value)
    setError(null)
    if (selectedPoi && value !== selectedPoi.displayName) setSelectedPoi(null)
  }

  // 點擊候選項選取
  function handleSelectPoi(poi: PoiCandidate) {
    setSelectedPoi(poi)
    setInputName(poi.displayName)
    setShowDropdown(false)
    setSuggestions([])
  }

  // 判斷新增按鈕是否可用
  function isAddEnabled(): boolean {
    if (!inputName.trim()) return false
    if (inputCoords.trim()) {
      const parts = inputCoords.trim().split(',')
      return parts.length === 2 && Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]))
    }
    return selectedPoi !== null  // Mode 1 必須選取 POI
  }

  // 新增景點
  function handleAdd() {
    if (!isAddEnabled()) return
    setError(null)

    if (inputCoords.trim()) {
      // Mode 2：手動經緯度
      const parts = inputCoords.trim().split(',').map(p => p.trim())
      const lat = Number(parts[0]); const lng = Number(parts[1])
      addAttraction(inputName.trim(), lat, lng, inputNotes.trim() || undefined, inputCategory, inputLink.trim() || undefined)
    } else {
      // Mode 1：使用選取的 POI 座標
      addAttraction(
        selectedPoi!.displayName,
        selectedPoi!.lat,
        selectedPoi!.lng,
        inputNotes.trim() || selectedPoi!.address || undefined,
        inputCategory,
        inputLink.trim() || undefined,
      )
    }
    resetForm()
  }

  function resetForm() {
    setInputName(''); setSelectedPoi(null); setSuggestions([])
    setShowDropdown(false); setInputCoords('')
    setInputNotes(''); setInputLink('')
    setInputCategory('scenic'); setIsFormOpen(false); setError(null)
  }

  const { setNodeRef: setPoolRef, isOver: isPoolOver } = useDroppable({ id: 'pool', data: { type: 'pool' } })
  const [activeAttraction, setActiveAttraction] = useState<Attraction | null>(null)

  const quickButtons = [
    { label: '新增景點', category: 'scenic' as const },
    { label: '新增酒店', category: 'hotel' as const },
    { label: '新增餐廳', category: 'restaurant' as const },
  ]

  // 加入按鈕狀態
  const addEnabled = isAddEnabled()
  const addBtnStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', border: 'none', borderRadius: '12px',
    background: addEnabled ? THEME.primary : THEME.border,
    color: 'white', cursor: addEnabled ? 'pointer' : 'not-allowed',
    fontSize: '14px', fontWeight: 700,
  }

  return (
    <div
      ref={setPoolRef}
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: isPoolOver ? 'rgba(207,227,239,0.9)' : 'rgba(219,233,242,0.42)',
        border: `1px solid ${THEME.borderLight}`, borderRadius: '24px',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* 標題 */}
      <div style={{ padding: '20px 18px 18px' }}>
        <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: THEME.textPrimary }}>🗺️ 景點池</h2>
      </div>

      {/* 新增表單區 */}
      <div style={{ padding: '0 18px 14px' }}>
        {/* 快速按鈕 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {quickButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => { setInputCategory(btn.category); setIsFormOpen(true) }}
              style={{
                border: `1px solid ${inputCategory === btn.category && isFormOpen ? getCategoryColor(btn.category) : THEME.border}`,
                background: inputCategory === btn.category && isFormOpen ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                color: THEME.textPrimary, borderRadius: '999px', padding: '6px 10px',
                fontSize: '12px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(33,70,90,0.05)',
              }}
            >{btn.label}</button>
          ))}
        </div>

        {isFormOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Mode 1：POI 聯想搜尋 */}
            <div style={{ position: 'relative' }} ref={searchWrapRef}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0 && !selectedPoi) setShowDropdown(true) }}
                    placeholder="輸入景點名稱搜尋候選…"
                    style={{
                      ...inputStyle,
                      borderColor: selectedPoi ? '#6BAF8D' : THEME.border,
                      paddingRight: selectedPoi || isSearching ? '32px' : '12px',
                    }}
                  />
                  {/* 狀態指示 */}
                  {isSearching && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: THEME.textMuted }}>…</span>
                  )}
                  {selectedPoi && !isSearching && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#6BAF8D' }}>✓</span>
                  )}
                </div>
              </div>

              {/* POI 候選下拉列表 */}
              {showDropdown && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  marginTop: '4px', background: 'white',
                  border: `1px solid ${THEME.border}`, borderRadius: '14px',
                  boxShadow: '0 8px 28px rgba(33,70,90,0.13)',
                  zIndex: 200, maxHeight: '260px', overflowY: 'auto', padding: '6px',
                }}>
                  {suggestions.map((poi, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectPoi(poi) }}
                      style={{
                        padding: '9px 10px', borderRadius: '10px', cursor: 'pointer',
                        borderBottom: idx < suggestions.length - 1 ? `1px solid ${THEME.borderLight}` : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = THEME.primaryBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: THEME.textPrimary }}>{poi.displayName}</div>
                      {poi.address && (
                        <div style={{ fontSize: '11px', color: THEME.textMuted, marginTop: '2px' }}>📍 {poi.address}</div>
                      )}
                      <div style={{ fontSize: '10px', color: '#A0B4BF', marginTop: '2px', fontFamily: "'Times New Roman', serif" }}>
                        {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 分隔提示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', background: THEME.borderLight }} />
              <span style={{ fontSize: '10px', color: THEME.textMuted }}>或手動輸入經緯度（Mode 2）</span>
              <div style={{ flex: 1, height: '1px', background: THEME.borderLight }} />
            </div>

            {/* Mode 2：手動經緯度 */}
            <input
              type="text"
              value={inputCoords}
              onChange={(e) => { setInputCoords(e.target.value); setError(null) }}
              placeholder="緯度,經度（例：36.0582,120.3425）"
              style={inputStyle}
            />

            {/* 附加資訊 */}
            <input type="text" value={inputNotes} onChange={(e) => setInputNotes(e.target.value)} placeholder="備註（選填）" style={inputStyle} />
            <input type="url" value={inputLink} onChange={(e) => setInputLink(e.target.value)} placeholder="攻略連結（選填）" style={inputStyle} />

            {/* 錯誤提示 */}
            {error && <div style={{ fontSize: '11px', color: THEME.accent }}>{error}</div>}

            {/* 按鈕列 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAdd} disabled={!addEnabled} style={addBtnStyle}>加入景點</button>
              <button onClick={resetForm} style={{ padding: '10px 14px', border: `1px solid ${THEME.border}`, borderRadius: '12px', background: 'white', cursor: 'pointer', fontSize: '13px', color: THEME.textMuted }}>取消</button>
            </div>

            {/* 操作提示 */}
            {!selectedPoi && !inputCoords.trim() && inputName.trim().length >= 2 && (
              <div style={{ fontSize: '11px', color: THEME.textMuted, textAlign: 'center' }}>
                請從下拉清單選取景點，或在上方輸入經緯度直接新增
              </div>
            )}
          </div>
        )}

        {error && !isFormOpen && <div style={{ fontSize: '11px', color: THEME.accent, marginBottom: '8px' }}>{error}</div>}
        <div style={{ borderBottom: `1px dashed ${THEME.border}`, marginTop: '12px' }} />
      </div>

      {/* 景點列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
        {attractionPool.map((attraction) => (
          <div key={attraction.id} onClick={() => setActiveAttraction(attraction)}>
            <AttractionCard attraction={attraction} onRemove={removeAttraction} />
          </div>
        ))}
      </div>

      {/* 編輯 Modal */}
      <AttractionDetailModal
        attraction={activeAttraction}
        onClose={() => setActiveAttraction(null)}
        onSave={(id, updates) => {
          const list = useTravelStore.getState().attractionPool
          useTravelStore.setState({
            attractionPool: list.map((item) => item.id === id ? { ...item, ...updates } : item),
          })
        }}
      />
    </div>
  )
}
