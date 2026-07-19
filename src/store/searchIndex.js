import { loadAllBooks } from './readingStore'

// 首次搜尋時才建立索引（載入全部 66 卷），之後重複使用
let indexPromise = null

function buildIndex(books) {
  const index = []
  for (const { meta, data } of books) {
    data.chapters.forEach((verses, i) => {
      const chapter = i + 1
      for (const [verse, text] of verses) {
        index.push({ bookId: meta.id, bookName: meta.name, chapter, verse, text })
      }
    })
  }
  return index
}

function getIndex() {
  if (!indexPromise) {
    indexPromise = loadAllBooks().then(buildIndex)
  }
  return indexPromise
}

// 中文全文搜尋以子字串比對為主（無明確斷詞邊界），依正典順序回傳前 limit 筆
export async function searchVerses(query, limit = 50) {
  const q = query.trim()
  if (!q) return []
  const index = await getIndex()
  const results = []
  for (const item of index) {
    if (item.text.includes(q)) {
      results.push(item)
      if (results.length >= limit) break
    }
  }
  return results
}
