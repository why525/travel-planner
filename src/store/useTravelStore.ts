// ============================================================
// 狀態管理：用 Zustand 儲存所有旅行資料
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Attraction, Day, ItineraryItem, ItemCategory } from '../types'
import { getDayColor } from '../theme'

function genId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

function createDefaultItems(): ItineraryItem[] {
  return [
    { id: genId(), name: '起床 & 整理', time: '07:00', notes: '', link: '', isDefault: true, category: 'scenic' },
    { id: genId(), name: '早餐', time: '08:00', notes: '', link: '', isDefault: true, category: 'restaurant' },
    { id: genId(), name: '午餐', time: '12:00', notes: '', link: '', isDefault: true, category: 'restaurant' },
    { id: genId(), name: '晚餐', time: '18:00', notes: '', link: '', isDefault: true, category: 'restaurant' },
  ]
}

function sortByTime(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    return toMin(a.time) - toMin(b.time)
  })
}

interface TravelStore {
  destination: string
  attractionPool: Attraction[]
  days: Day[]
  setDestination: (name: string) => void
  addAttraction: (name: string, lat?: number, lng?: number, notes?: string, category?: ItemCategory, link?: string) => void
  removeAttraction: (id: string) => void
  addDay: () => void
  removeDay: (dayId: string) => void
  updateDayDate: (dayId: string, date: string) => void
  addItemToDay: (dayId: string, item: Omit<ItineraryItem, 'id'>) => void
  removeItemFromDay: (dayId: string, itemId: string) => void
  updateItem: (dayId: string, itemId: string, updates: Partial<ItineraryItem>) => void
  moveAttractionToDay: (attractionId: string, dayId: string, insertIndex?: number) => void
  moveItemToPool: (dayId: string, itemId: string) => void
  moveItemBetweenDays: (fromDayId: string, toDayId: string, itemId: string, insertIndex?: number) => void
  reorderItemInDay: (dayId: string, fromIndex: number, toIndex: number) => void
}

export const useTravelStore = create<TravelStore>()(
  persist(
    (set) => ({
      destination: '青島',
      attractionPool: [
        { id: genId(), name: '棧橋', lat: 36.0574, lng: 120.3165, address: '山東省青島市市南區', category: 'scenic' },
        { id: genId(), name: '八大關', lat: 36.0650, lng: 120.3568, address: '山東省青島市市南區', category: 'scenic' },
        { id: genId(), name: '青島啤酒博物館', lat: 36.0829, lng: 120.3788, address: '山東省青島市市北區', category: 'scenic' },
        { id: genId(), name: '嶗山風景區', lat: 36.1542, lng: 120.6200, address: '山東省青島市嶗山區', category: 'scenic' },
      ],
      days: [{ id: genId(), label: 'Day 1', date: '', color: getDayColor(0), items: createDefaultItems() }],
      setDestination: (name) => set({ destination: name }),
      addAttraction: (name, lat, lng, notes, category = 'scenic', link) =>
        set((state) => ({ attractionPool: [...state.attractionPool, { id: genId(), name, lat, lng, notes, category, link }] })),
      removeAttraction: (id) => set((state) => ({ attractionPool: state.attractionPool.filter((a) => a.id !== id) })),
      addDay: () =>
        set((state) => ({
          days: [...state.days, { id: genId(), label: `Day ${state.days.length + 1}`, date: '', color: getDayColor(state.days.length), items: createDefaultItems() }],
        })),
      removeDay: (dayId) => set((state) => ({ days: state.days.filter((d) => d.id !== dayId) })),
      updateDayDate: (dayId, date) => set((state) => ({ days: state.days.map((day) => day.id === dayId ? { ...day, date } : day) })),
      addItemToDay: (dayId, item) =>
        set((state) => ({ days: state.days.map((day) => day.id !== dayId ? day : { ...day, items: sortByTime([...day.items, { ...item, id: genId() }]) }) })),
      removeItemFromDay: (dayId, itemId) =>
        set((state) => ({ days: state.days.map((day) => day.id !== dayId ? day : { ...day, items: day.items.filter((i) => i.id !== itemId) }) })),
      updateItem: (dayId, itemId, updates) =>
        set((state) => ({ days: state.days.map((day) => {
          if (day.id !== dayId) return day
          const updated = day.items.map((item) => item.id === itemId ? { ...item, ...updates } : item)
          return { ...day, items: updates.time ? sortByTime(updated) : updated }
        }) })),
      moveAttractionToDay: (attractionId, dayId, insertIndex) =>
        set((state) => {
          const attraction = state.attractionPool.find((a) => a.id === attractionId)
          if (!attraction) return state
          const newPool = state.attractionPool.filter((a) => a.id !== attractionId)
          const newItem: ItineraryItem = { id: genId(), name: attraction.name, time: '09:00', notes: '', link: '', lat: attraction.lat, lng: attraction.lng, address: attraction.address, category: attraction.category || 'scenic' }
          const newDays = state.days.map((day) => day.id !== dayId ? day : { ...day, items: sortByTime(insertIndex !== undefined ? (() => { const list = [...day.items]; list.splice(insertIndex, 0, newItem); return list })() : [...day.items, newItem]) })
          return { attractionPool: newPool, days: newDays }
        }),
      moveItemToPool: (dayId, itemId) =>
        set((state) => {
          const day = state.days.find((d) => d.id === dayId)
          const item = day?.items.find((i) => i.id === itemId)
          if (!item) return state
          const newAttraction: Attraction = { id: genId(), name: item.name, lat: item.lat, lng: item.lng, address: item.address, category: item.category }
          return { days: state.days.map((d) => d.id !== dayId ? d : { ...d, items: d.items.filter((i) => i.id !== itemId) }), attractionPool: [...state.attractionPool, newAttraction] }
        }),
      moveItemBetweenDays: (fromDayId, toDayId, itemId, insertIndex) =>
        set((state) => {
          const fromDay = state.days.find((d) => d.id === fromDayId)
          const item = fromDay?.items.find((i) => i.id === itemId)
          if (!item) return state
          const newItem = { ...item, id: genId() }
          const newDays = state.days.map((day) => {
            if (day.id === fromDayId) return { ...day, items: day.items.filter((i) => i.id !== itemId) }
            if (day.id === toDayId) {
              const list = [...day.items]
              if (insertIndex !== undefined) list.splice(insertIndex, 0, newItem)
              else list.push(newItem)
              return { ...day, items: sortByTime(list) }
            }
            return day
          })
          return { days: newDays }
        }),
      reorderItemInDay: (dayId, fromIndex, toIndex) =>
        set((state) => ({ days: state.days.map((day) => day.id !== dayId ? day : (() => { const items = [...day.items]; const [moved] = items.splice(fromIndex, 1); items.splice(toIndex, 0, moved); return { ...day, items } })()) })),
    }),
    { name: 'travel-planner-data' }
  )
)
