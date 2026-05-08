// ============================================================
// 主應用程式
// ============================================================
import { useState, lazy, Suspense } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, pointerWithin, getFirstCollision, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { CollisionDetection } from '@dnd-kit/core'
import { useTravelStore } from './store/useTravelStore'
import { THEME } from './theme'
import { ItineraryItem } from './types'
import AttractionPool from './components/AttractionPool'
import DayColumn from './components/DayColumn'
import EditItemModal from './components/EditItemModal'

// 地圖較重，用 lazy 載入避免阻擋首頁渲染
const TravelMap = lazy(() => import('./components/TravelMap'))

// 拖曳時跟著游標的預覽卡片
function DragPreviewCard({ name, color }: { name: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.96)',
      border: `1px solid ${color || THEME.primary}`,
      borderLeft: `4px solid ${color || THEME.primary}`,
      borderRadius: '16px',
      padding: '10px 14px',
      fontSize: '13px',
      fontWeight: 700,
      color: THEME.textPrimary,
      boxShadow: '0 16px 34px rgba(33,70,90,0.16)',
      userSelect: 'none',
      minWidth: '140px',
      backdropFilter: 'blur(10px)',
    }}>⠿ {name}</div>
  )
}

export default function App() {
  const destination    = useTravelStore((s) => s.destination)
  const setDestination = useTravelStore((s) => s.setDestination)
  const days           = useTravelStore((s) => s.days)
  const attractionPool = useTravelStore((s) => s.attractionPool)
  const addDay         = useTravelStore((s) => s.addDay)
  const moveAttractionToDay   = useTravelStore((s) => s.moveAttractionToDay)
  const moveItemToPool        = useTravelStore((s) => s.moveItemToPool)
  const moveItemBetweenDays   = useTravelStore((s) => s.moveItemBetweenDays)
  const reorderItemInDay      = useTravelStore((s) => s.reorderItemInDay)
  const updateItem            = useTravelStore((s) => s.updateItem)

  const [editingItem,   setEditingItem]   = useState<ItineraryItem | null>(null)
  const [editingDayId,  setEditingDayId]  = useState<string>('')
  const [activeDragData, setActiveDragData] = useState<{ name: string; color?: string } | null>(null)
  const [showPoolOnMobile, setShowPoolOnMobile] = useState(false)
  const showPool = typeof window !== 'undefined' && window.innerWidth >= 768 ? true : showPoolOnMobile

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // 自定義碰撞檢測：優先用 pointerWithin（鼠標實際位置），找不到再 fallback closestCorners
  // 修復：確保鼠標移入景點池區域時能正確命中 pool droppable，而非被 Day droppable 搶佔
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return getFirstCollision(closestCorners(args)) ? closestCorners(args) : []
  }

  // 拖曳開始時記錄被拖的項目資訊，顯示預覽卡片
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type: string; attractionId?: string; dayId?: string; itemId?: string } | undefined
    if (!data) return
    if (data.type === 'pool-item' && data.attractionId) {
      const attraction = attractionPool.find((a) => a.id === data.attractionId)
      setActiveDragData({ name: attraction?.name ?? '項目', color: THEME.primary })
    } else if (data.type === 'day-item' && data.dayId && data.itemId) {
      const day  = days.find((d) => d.id === data.dayId)
      const item = day?.items.find((i) => i.id === data.itemId)
      setActiveDragData({ name: item?.name ?? '項目', color: day?.color })
    }
  }

  // 拖曳結束時判斷要做什麼：移到 Day、移回景點池、同 Day 排序、跨 Day 移動
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragData(null)
    if (!over) return
    const activeData = active.data.current as { type: string; attractionId?: string; dayId?: string; itemId?: string } | undefined
    const overData   = over.data.current   as { type: string; dayId?: string; itemId?: string }                        | undefined
    if (!activeData) return

    // 景點池 → Day
    if (activeData.type === 'pool-item' && activeData.attractionId) {
      const targetDayId = overData?.type === 'day' ? overData.dayId
        : overData?.type === 'day-item' ? overData.dayId : null
      if (targetDayId) moveAttractionToDay(activeData.attractionId, targetDayId)
      return
    }

    // Day 項目拖曳
    if (activeData.type === 'day-item' && activeData.dayId && activeData.itemId) {
      const fromDayId = activeData.dayId
      const itemId    = activeData.itemId

      if (over.id === 'pool' || overData?.type === 'pool' || (typeof over.id === 'string' && over.id.startsWith('pool-'))) return moveItemToPool(fromDayId, itemId)
      if (overData?.type === 'day' && overData.dayId)       return fromDayId !== overData.dayId && moveItemBetweenDays(fromDayId, overData.dayId, itemId)

      if (overData?.type === 'day-item' && overData.dayId) {
        const toDayId  = overData.dayId
        const toItemId = overData.itemId
        if (fromDayId === toDayId) {
          // 同一 Day 內重新排序
          const day = days.find((d) => d.id === fromDayId)
          if (!day) return
          const fromIndex = day.items.findIndex((i) => i.id === itemId)
          const toIndex   = day.items.findIndex((i) => i.id === toItemId)
          if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) reorderItemInDay(fromDayId, fromIndex, toIndex)
        } else {
          // 跨 Day 移動
          moveItemBetweenDays(fromDayId, toDayId, itemId)
        }
      }
    }
  }

  function handleEditItem(dayId: string, item: ItineraryItem) {
    setEditingDayId(dayId)
    setEditingItem(item)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FAF8F2 0%, #F5F2EA 100%)', overflow: 'hidden', padding: '72px 24px 32px' }}>

      {/* ── 頂部標題列 ── */}
      <header style={{ width: '100%', maxWidth: '1200px', margin: '0 auto 26px', padding: '0 6px 0', color: '#2F3E49', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onBlur={() => {
              const raw = (destination || '萬用旅行規劃').trim()
              document.title = raw.replace(/(\S+)(\s+\1)+/g, '$1').trim()
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
            style={{ fontFamily: "'SeparateSerif', 'Noto Serif SC', 'SimSun', '宋体', serif", fontSize: '34px', fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.3, color: '#2F3E49', border: 'none', outline: 'none', background: 'transparent', padding: '4px 0 6px', width: '100%' }}
          />
          <button onClick={() => setShowPoolOnMobile((v) => !v)} style={{ display: 'none', border: '1px solid #BFD8E6', background: '#fff', color: '#2F3E49', borderRadius: '999px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }} className="max-md:block md:hidden">
            {showPoolOnMobile ? '隱藏景點池' : '顯示景點池'}
          </button>
          <div style={{ width: '100%', height: '1px', marginTop: '2px', background: '#BFD8E6', borderRadius: '999px', opacity: 0.85 }} />
        </div>
      </header>

      {/* ── 主體：左側景點池 + 右側（地圖上 / 行程卡片下）── */}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, gap: '18px' }}>

          {/* 左側：景點池（手機隱藏，桌面顯示） */}
          <div style={{ width: '290px', flexShrink: 0, display: showPool ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden', borderRadius: '24px', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(10px)' }} className="md:flex">
            <AttractionPool />
          </div>

          {/* 右側：上方地圖 + 下方行程卡片區 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '18px' }}>

            {/* 地圖區（固定高度，與之前功能完全相同） */}
            <div style={{ height: '360px', flexShrink: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(191,216,230,0.45)', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(10px)' }}>
              <Suspense fallback={
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.primaryBg, color: THEME.textMuted, fontSize: '13px' }}>
                  地圖載入中…
                </div>
              }>
                <TravelMap />
              </Suspense>
            </div>

            {/* 行程卡片捲動區（手機橫滑 / 桌面換行） */}
            <div className="flex gap-4 p-0.5 pb-1.5 md:flex-wrap md:overflow-auto md:content-start md:items-start overflow-x-auto overflow-y-hidden flex-nowrap items-start" style={{ flex: 1 }}>
              {days.map((day) => (
                <DayColumn key={day.id} day={day} onEditItem={handleEditItem} />
              ))}
              {/* 新增 Day 按鈕 */}
              <button
                onClick={addDay}
                style={{ minWidth: '132px', height: '132px', flexShrink: 0, border: `1px dashed ${THEME.border}`, borderRadius: '20px', background: 'rgba(255,255,255,0.70)', cursor: 'pointer', color: THEME.textMuted, fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-start', backdropFilter: 'blur(8px)' }}
              >
                <span style={{ fontSize: '24px' }}>＋</span>
                <span>新增 Day {days.length + 1}</span>
              </button>
            </div>

          </div>
        </div>

        <DragOverlay>
          {activeDragData ? <DragPreviewCard name={activeDragData.name} color={activeDragData.color} /> : null}
        </DragOverlay>
      </DndContext>

      {/* 編輯彈窗 */}
      <EditItemModal
        item={editingItem}
        dayId={editingDayId}
        onSave={(dayId, itemId, updates) => updateItem(dayId, itemId, updates)}
        onClose={() => setEditingItem(null)}
      />
    </div>
  )
}
