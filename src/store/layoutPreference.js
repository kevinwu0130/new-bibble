const RATIO_KEY = 'new-bibble:split-ratio'
const COLLAPSED_KEY = 'new-bibble:split-collapsed'

export const DEFAULT_SPLIT_RATIO = 0.5
export const MIN_SPLIT_RATIO = 0.12
export const MAX_SPLIT_RATIO = 0.85

// ratio = 地圖／插圖區塊佔容器的比例（0~1）
export function loadSplitRatio() {
  try {
    const v = Number(localStorage.getItem(RATIO_KEY))
    return v >= MIN_SPLIT_RATIO && v <= MAX_SPLIT_RATIO ? v : DEFAULT_SPLIT_RATIO
  } catch {
    return DEFAULT_SPLIT_RATIO
  }
}

export function saveSplitRatio(ratio) {
  try {
    localStorage.setItem(RATIO_KEY, String(ratio))
  } catch {
    // 忽略（隱私瀏覽模式等 storage 不可用的情況）
  }
}

export function loadRightCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function saveRightCollapsed(collapsed) {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // 忽略
  }
}
