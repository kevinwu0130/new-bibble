import { create } from 'zustand'
import bookIndex from '../data/bookIndex.json'

// 66 卷書依需要動態載入（每卷一個 chunk），註解層很小所以直接打包
const bookModules = import.meta.glob('../data/books/*.json')
const annoModules = import.meta.glob('../data/annotations/*.json', { eager: true })

export const BOOKS = bookIndex

// key: `${bookId}-${chapter}` → 該章的地圖註解（高亮/實體/路線）
export const ANNOTATIONS = {}
for (const mod of Object.values(annoModules)) {
  const a = mod.default
  ANNOTATIONS[`${a.bookId}-${a.chapter}`] = a
}

export const getBookMeta = (bookId) => bookIndex.find((b) => b.id === bookId)

export const getAnnotation = (bookId, chapter) => ANNOTATIONS[`${bookId}-${chapter}`] || null

const bookCache = {}

async function loadBook(bookId) {
  if (bookCache[bookId]) return bookCache[bookId]
  const meta = getBookMeta(bookId)
  const path = `../data/books/${String(meta.order).padStart(2, '0')}-${meta.id}.json`
  const mod = await bookModules[path]()
  bookCache[bookId] = mod.default
  return mod.default
}

let loadSeq = 0

export const useReadingStore = create((set, get) => ({
  activeBookId: 'exodus',
  activeChapter: 14,
  activeEntityId: null,
  bookData: null,
  loading: true,

  setLocation: async (bookId, chapter) => {
    const seq = ++loadSeq
    set({ loading: true, activeEntityId: null })
    const data = await loadBook(bookId)
    if (seq !== loadSeq) return // 載入期間又切換了，放棄這次結果
    const ch = Math.min(Math.max(1, chapter), data.chapters.length)
    set({ activeBookId: bookId, activeChapter: ch, bookData: data, loading: false })
  },

  stepChapter: (delta) => {
    const { activeChapter, bookData } = get()
    if (!bookData) return
    const next = activeChapter + delta
    if (next < 1 || next > bookData.chapters.length) return
    set({ activeChapter: next, activeEntityId: null })
  },

  setActiveEntity: (entityId) => set({ activeEntityId: entityId }),
}))

// 初始載入預設章節
useReadingStore.getState().setLocation('exodus', 14)
