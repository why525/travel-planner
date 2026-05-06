// ============================================================
// 行程項目卡片元件
// ============================================================
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ItineraryItem } from '../types'
import { THEME, getCategoryColor } from '../theme'

interface ItineraryItemCardProps {
  item: ItineraryItem
  dayId: string
  dayColor: string
  onEdit: (dayId: string, item: ItineraryItem) => void
  onRemove: (dayId: string, itemId: string) => void
}

export default function ItineraryItemCard({ item, dayId, dayColor, onEdit, onRemove }: ItineraryItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${dayId}-${item.id}`, data: { type: 'day-item', dayId, itemId: item.id } })
  const categoryColor = getCategoryColor(item.category)
  const itemTextColor = '#6B7D84'
  const deepDayColor = `${dayColor}CC`
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.34 : 1, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', zIndex: isDragging ? 999 : undefined }
  const editIconStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    color: THEME.textMuted,
  }
  return (
    <div ref={setNodeRef} style={{ ...style, background: 'rgba(255,255,255,0.9)', border: `1px solid ${THEME.borderLight}`, borderLeft: `4px solid ${categoryColor}`, borderRadius: '12px', padding: '6px 14px', marginBottom: '6px', boxShadow: isDragging ? `0 16px 28px ${dayColor}22` : 'none', backdropFilter: 'blur(8px)' }} {...listeners} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <span style={{ color: THEME.textMuted, fontSize: '14px', marginTop: '1px' }}>⠿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: itemTextColor, background: `${dayColor}24`, padding: '2px 8px', borderRadius: '999px', fontWeight: 800, flexShrink: 0 }}>{item.time}</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: itemTextColor, whiteSpace: 'nowrap', minWidth: 0 }}>{item.name}</span>
          </div>
          {item.notes && <div style={{ fontSize: '11px', color: itemTextColor, opacity: 0.88, marginTop: '3px' }}>📝 {item.notes}</div>}
          {item.link && <div style={{ marginTop: '3px' }}><a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: THEME.primary, textDecoration: 'none' }}>🔗 查看攻略</a></div>}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(dayId, item) }} onPointerDown={(e) => e.stopPropagation()} style={editIconStyle} title="編輯">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L16.62 5.5a1.5 1.5 0 0 0-2.12 0L4 16v4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M14.5 6.5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(dayId, item.id) }} onPointerDown={(e) => e.stopPropagation()} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', borderRadius: '4px', color: '#C0CDD6', lineHeight: 1 }}>×</button>
        </div>
      </div>
    </div>
  )
}
