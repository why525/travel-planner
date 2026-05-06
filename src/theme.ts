// ============================================================
// 主題設定檔 - 只需要改這裡就能換整體色系
// ============================================================

export const THEME = {
  name: '青島',
  subtitle: '大海與紅磚的城市',
  primary: '#86A9BB',
  primaryLight: '#DDE8EE',
  primaryDark: '#5E7886',
  primaryBg: '#F4F7F8',
  accent: '#C88C7A',
  accentLight: '#EFE0DA',
  bgPage: '#F7F8F8',
  bgCard: '#FFFFFF',
  bgSidebar: '#F4F6F7',
  textPrimary: '#2D414A',
  textSecondary: '#6B7D84',
  textMuted: '#A0A9AD',
  border: '#D9E0E3',
  borderLight: '#E8ECEE',
  mapCenter: [36.0671, 120.3826] as [number, number],
  mapZoom: 12,
}

// 莫蘭迪 Day 顏色：低飽和、柔和，避開純紅純藍
// 鼠尾草綠、暖沙、薰衣草、霧茶、橄欖、藕粉、煙灰玫瑰、青苔
export const DAY_COLORS = [
  '#dac39a',  // 奶茶
  '#9EC3BC',  // 綠松石
  '#aea7bf',  // 薰衣草灰
  '#b4c9c9',  // 莫蘭迪灰
  '#d8b8b7',  // 藕粉煙
  '#9DB5A5',  // 鼠尾草綠
  '#8FADA8',  // 霧茶藍綠
  '#B3AE88',  // 橄欖綠
  '#A6B09C',  // 青苔綠
  '#B8A8AF',  // 煙灰玫瑰
]

export const ITEM_CATEGORY_COLORS = {
  scenic: '#88AFC2',
  hotel: '#D8B95F',
  restaurant: '#C9776A',
}

// 交通方式對應的 icon 和顏色
export const TRANSPORT_ICONS: Record<string, string> = {
  walk:   '🚶',
  taxi:   '🚕',
  subway: '🚇',
  bus:    '🚌',
  car:    '🚗',
  ferry:  '⛴️',
}

export const TRANSPORT_LABELS: Record<string, string> = {
  walk:   '步行',
  taxi:   '打車',
  subway: '地鐵',
  bus:    '巴士',
  car:    '自駕',
  ferry:  '船渡',
}

export function getDayColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length]
}

export function getCategoryColor(category: string): string {
  return ITEM_CATEGORY_COLORS[category as keyof typeof ITEM_CATEGORY_COLORS] || THEME.primary
}
