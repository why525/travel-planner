// ============================================================
// 編輯行程項目的彈窗
// 可以修改：名稱、時間、備註、攻略連結、前往下一站的交通資訊
// ============================================================
import { useState, useEffect } from 'react'
import { ItineraryItem, TransportMode } from '../types'
import { THEME, TRANSPORT_ICONS, TRANSPORT_LABELS } from '../theme'

interface EditItemModalProps {
  item: ItineraryItem | null
  dayId: string
  onSave: (dayId: string, itemId: string, updates: Partial<ItineraryItem>) => void
  onClose: () => void
}

// 交通方式選項（用於交通按鈕列）
const TRANSPORT_OPTIONS: { mode: TransportMode; label: string }[] = [
  { mode: 'walk',   label: '步行'   },
  { mode: 'subway', label: '地鐵'   },
  { mode: 'bus',    label: '巴士'   },
  { mode: 'taxi',   label: '打車'   },
  { mode: 'car',    label: '自駕'   },
  { mode: 'ferry',  label: '船渡'   },
]

export default function EditItemModal({ item, dayId, onSave, onClose }: EditItemModalProps) {
  // 表單欄位狀態
  const [name,          setName]          = useState('')
  const [time,          setTime]          = useState('')
  const [notes,         setNotes]         = useState('')
  const [link,          setLink]          = useState('')
  const [transportMode, setTransportMode] = useState<TransportMode>('')  // 前往下一站的交通方式
  const [transport,     setTransport]     = useState('')                  // 交通說明（例如「15 分鐘」）
  const [latStr,        setLatStr]        = useState('')
  const [lngStr,        setLngStr]        = useState('')

  // 當 item 改變時，把資料填入表單
  useEffect(() => {
    if (item) {
      setName(item.name)
      setTime(item.time)
      setNotes(item.notes)
      setLink(item.link)
      setTransportMode(item.transportMode ?? '')
      setTransport(item.transport ?? '')
      setLatStr(item.lat != null ? String(item.lat) : '')
      setLngStr(item.lng != null ? String(item.lng) : '')
    }
  }, [item])

  if (!item) return null

  function handleSave() {
    if (!item) return
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    const coordUpdates = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}
    onSave(dayId, item.id, { name, time, notes, link, transportMode, transport, ...coordUpdates })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  // 通用輸入框樣式
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${THEME.border}`,
    borderRadius: '8px', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* 標題列 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: THEME.textPrimary }}>編輯行程項目</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#f0f0f0', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 名稱 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '6px' }}>景點 / 活動名稱 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：棧橋、午餐、購物" style={inputStyle} autoFocus />
          </div>

          {/* 經緯度 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '6px' }}>
              經緯度 <span style={{ fontWeight: 400, color: THEME.textMuted }}>(修改後地圖標記自動更新)</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={latStr}
                onChange={(e) => setLatStr(e.target.value)}
                placeholder="緯度（例：36.0582）"
                step="any"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                value={lngStr}
                onChange={(e) => setLngStr(e.target.value)}
                placeholder="經度（例：120.3425）"
                step="any"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* 時間 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '6px' }}>時間（用於自動排序）</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </div>

          {/* 備註 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '6px' }}>備註</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：記得帶相機、需要提前訂位" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* 攻略連結 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '6px' }}>攻略連結</label>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>

          {/* ── 前往下一站的交通資訊 ── */}
          <div style={{ borderTop: `1px solid ${THEME.borderLight}`, paddingTop: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: THEME.textSecondary, marginBottom: '8px' }}>
              前往下一站的交通 <span style={{ fontWeight: 400, color: THEME.textMuted }}>(選填)</span>
            </label>

            {/* 交通方式按鈕列 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {/* 清除按鈕 */}
              <button
                onClick={() => setTransportMode('')}
                style={{ border: `1.5px solid ${transportMode === '' ? THEME.primary : THEME.border}`, background: transportMode === '' ? THEME.primaryLight : 'white', borderRadius: '999px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', color: transportMode === '' ? THEME.primaryDark : THEME.textMuted }}
              >不填</button>
              {TRANSPORT_OPTIONS.map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setTransportMode(mode)}
                  style={{ border: `1.5px solid ${transportMode === mode ? THEME.primary : THEME.border}`, background: transportMode === mode ? THEME.primaryLight : 'white', borderRadius: '999px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', color: transportMode === mode ? THEME.primaryDark : THEME.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>{TRANSPORT_ICONS[mode]}</span>{label}
                </button>
              ))}
            </div>

            {/* 交通說明（例如「15 分鐘」「換乘 2 號線」） */}
            {transportMode && (
              <input
                type="text"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                placeholder={`例如：「15 分鐘」「換乘 2 號線」`}
                style={inputStyle}
              />
            )}
          </div>

        </div>

        {/* 按鈕列 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1.5px solid ${THEME.border}`, borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', color: THEME.textSecondary }}>取消</button>
          <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: name.trim() ? THEME.primary : THEME.border, color: 'white', cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 600 }}>儲存</button>
        </div>

      </div>
    </div>
  )
}
