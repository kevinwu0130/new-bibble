import { getBookMeta } from './readingStore'

const STORAGE_KEY = 'new-bibble:last-position'

// localStorage 可能因隱私模式或瀏覽器設定而不可用，一律容錯
export function saveLastPosition(bookId, chapter) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookId, chapter }))
  } catch {
    // 忽略
  }
}

// 回傳上次閱讀位置，需通過 bookIndex 驗證才視為有效
export function loadLastPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { bookId, chapter } = JSON.parse(raw)
    const meta = getBookMeta(bookId)
    if (!meta || !Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapterCount) return null
    return { bookId, chapter }
  } catch {
    return null
  }
}
