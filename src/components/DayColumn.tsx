// ============================================================
// 每日行程欄位元件
// ============================================================
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTravelStore } from '../store/useTravelStore'
import { THEME, TRANSPORT_ICONS, TRANSPORT_LABELS } from '../theme'
import { Day, ItineraryItem, TransportMode } from '../types'
import ItineraryItemCard from './ItineraryItemCard'

interface DayColumnProps {
  day: Day
  onEditItem: (dayId: string, item: ItineraryItem) => void
}

// 兩張卡片之間的交通資訊連結條
function TransportConnector({ mode, text, dayColor }: { mode?: TransportMode; text?: string; dayColor: string }) {
  if (!text && !mode) return null
  const icon  = mode ? (TRANSPORT_ICONS[mode] ?? '🚗') : '🚗'
  const label = mode ? (TRANSPORT_LABELS[mode] ?? '') : ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', padding: '0 10px' }}>
      <div style={{ width: '1px', height: '14px', flexShrink: 0, borderLeft: `1.5px dashed ${dayColor}CC`, marginLeft: '7px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${dayColor}18`, border: `1px solid ${dayColor}52`, borderRadius: '999px', padding: '3px 10px', fontSize: '11px', color: THEME.textSecondary, whiteSpace: 'nowrap' }}>
        <span>{icon}</span>
        {label && <span style={{ fontWeight: 600 }}>{label}</span>}
        {text && <span>{text}</span>}
      </div>
    </div>
  )
}

export default function DayColumn({ day, onEditItem }: DayColumnProps) {
  const removeDay         = useTravelStore((s) => s.removeDay)
  const removeItemFromDay = useTravelStore((s) => s.removeItemFromDay)
  const addItemToDay      = useTravelStore((s) => s.addItemToDay)
  const updateDayDate     = useTravelStore((s) => s.updateDayDate)

  const [isAdding,     setIsAdding]     = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newTime,      setNewTime]      = useState('09:00')
  const [newCategory,  setNewCategory]  = useState<'scenic' | 'hotel' | 'restaurant'>('scenic')
  const [newCoords,    setNewCoords]    = useState('') // 手動經緯度輸入欄位

  // dnd-kit droppable 區域
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.id}`, data: { type: 'day', dayId: day.id } })
  const itemIds = day.items.map((item) => `item-${day.id}-${item.id}`)

  function handleQuickAdd() {
    if (!newName.trim()) return
    const coordsText = newCoords.trim() // 取得經緯度字串
    const coordsParts = coordsText ? coordsText.split(',').map((part) => part.trim()) : [] // 依逗號切開
    const lat = coordsParts.length === 2 ? Number(coordsParts[0]) : undefined // 轉成緯度
    const lng = coordsParts.length === 2 ? Number(coordsParts[1]) : undefined // 轉成經度
    const safeLat = Number.isFinite(lat) ? lat : undefined // 檢查緯度是否有效
    const safeLng = Number.isFinite(lng) ? lng : undefined // 檢查經度是否有效
    addItemToDay(day.id, { name: newName.trim(), time: newTime, notes: '', link: '', category: newCategory, lat: safeLat, lng: safeLng }) // 新增時直接帶入座標
    setNewName('')
    setNewTime('09:00')
    setNewCategory('scenic')
    setNewCoords('') // 清空座標欄位
    setIsAdding(false)
  }

  function handleQuickAddKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleQuickAdd()
    if (e.key === 'Escape') { setIsAdding(false); setNewName('') }
  }

  return (
    <div style={{
      width: 'calc(33.33% - 11px)', minWidth: '240px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.84)',
      borderRadius: '20px',
      border: `1px solid ${isOver ? day.color : THEME.borderLight}`,
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
    }}>

      {/* ── 標題列（用 Day 的莫蘭迪顏色） ── */}
      <div style={{ background: day.color, padding: '8px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '15px', lineHeight: 1 }}>{day.label}</div>
            <input
              value={day.date}
              onChange={(e) => updateDayDate(day.id, e.target.value)}
              type="date"
              style={{ border: 'none', borderRadius: '999px', padding: '4px 10px', fontSize: '13px', background: 'rgba(255,255,255,0.36)', color: '#7F8A91', outline: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)', fontWeight: 700, flexShrink: 0 }}
            />
          </div>
          <button
            onClick={() => { if (confirm(`確定要刪除 ${day.label} 嗎？`)) removeDay(day.id) }}
            style={{ border: 'none', background: 'rgba(255,255,255,0.18)', borderRadius: '999px', width: '28px', height: '28px', color: 'white', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      </div>

      {/* ── 項目列表（可拖放） ── */}
      <div
        ref={setNodeRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', background: isOver ? 'rgba(255,255,255,0.38)' : 'transparent', minHeight: '80px' }}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {day.items.map((item, index) => (
            <div key={item.id}>
              <ItineraryItemCard
                item={item}
                dayId={day.id}
                dayColor={day.color}
                onEdit={onEditItem}
                onRemove={removeItemFromDay}
              />
              {/* 如果此項目有記錄前往下一站的交通資訊，顯示連結條 */}
              {index < day.items.length - 1 && (item.transport || item.transportMode) && (
                <TransportConnector
                  mode={item.transportMode}
                  text={item.transport}
                  dayColor={day.color}
                />
              )}
            </div>
          ))}
          {day.items.length === 0 && (
            <div style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '12px', padding: '16px 0' }}>
              拖景點進來，或用下方新增
            </div>
          )}
        </SortableContext>
      </div>

      {/* ── 底部新增按鈕 / 快速新增表單 ── */}
      <div style={{ borderTop: `1px solid ${THEME.borderLight}`, padding: '6px 14px' }}>
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.textSecondary, fontSize: '13px', padding: '4px 0', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span style={{ width: '20px', height: '20px', borderRadius: '999px', background: day.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>+</span>
            新增項目
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleQuickAddKey}
              placeholder="項目名稱"
              autoFocus
              style={{ padding: '9px 10px', border: `1px solid ${THEME.border}`, borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.92)' }}
            />
            <input
              type="text"
              value={newCoords}
              onChange={(e) => setNewCoords(e.target.value)}
              onKeyDown={handleQuickAddKey}
              placeholder="經緯度：36.0582,120.3425"
              style={{ padding: '9px 10px', border: `1px solid ${THEME.border}`, borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.92)' }}
            />
            {/* 類別選擇 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {([['scenic','景點'],['hotel','酒店'],['restaurant','餐廳']] as const).map(([cat, label]) => (
                <button key={cat} onClick={() => setNewCategory(cat)} style={{ border: `1px solid ${newCategory === cat ? 'transparent' : THEME.border}`, background: newCategory === cat ? 'rgba(136,175,194,0.14)' : 'white', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={{ flex: 1, padding: '9px 10px', border: `1px solid ${THEME.border}`, borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.92)' }}
              />
              <button
                onClick={handleQuickAdd}
                disabled={!newName.trim()}
                style={{ padding: '9px 14px', border: 'none', borderRadius: '12px', background: newName.trim() ? day.color : THEME.border, color: 'white', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 700 }}
              >加入</button>
              <button
                onClick={() => { setIsAdding(false); setNewName('') }}
                style={{ padding: '9px 10px', border: `1px solid ${THEME.border}`, borderRadius: '12px', background: 'white', cursor: 'pointer', fontSize: '13px', color: THEME.textMuted }}
              >取消</button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
