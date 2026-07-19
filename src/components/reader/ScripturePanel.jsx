import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getAnnotation, getBookMeta, useReadingStore } from '../../store/readingStore'
import VerseLine from './VerseLine'

export default function ScripturePanel() {
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const bookData = useReadingStore((s) => s.bookData)
  const loading = useReadingStore((s) => s.loading)
  const location = useLocation()
  const scrolledKeyRef = useRef(null)

  // 從搜尋結果點進來時，捲動到指定節並短暫高亮。
  // 這個 effect 可能在 App 的路由同步 effect 之前執行，此時 store 還是上一章的資料——
  // 用網址與 store 是否一致做守門，避免用殘留的舊章節 DOM 誤判「已完成捲動」。
  useEffect(() => {
    const scrollToVerse = location.state?.scrollToVerse
    if (!scrollToVerse || loading || !bookData) return
    if (scrolledKeyRef.current === location.key) return
    if (location.pathname !== `/${activeBookId}/${activeChapter}`) return
    const el = document.getElementById(`verse-${scrollToVerse}`)
    if (!el) return
    scrolledKeyRef.current = location.key
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('verse-flash')
    setTimeout(() => el.classList.remove('verse-flash'), 2000)
  }, [location.key, location.state, location.pathname, loading, bookData, activeBookId, activeChapter])

  if (loading || !bookData) {
    return <div className="p-6 text-gray-400 text-sm">載入中…</div>
  }

  const meta = getBookMeta(activeBookId)
  const anno = getAnnotation(activeBookId, activeChapter)
  const verses = bookData.chapters[activeChapter - 1].map(([verse, text]) => ({
    verse,
    text,
    highlights: anno?.highlights?.[verse] || [],
  }))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {anno?.titleZh || `${meta.name} 第 ${activeChapter} 章`}
      </h1>
      <p className="text-sm text-gray-400 mb-1">
        {meta.name} {activeChapter} 章 · 和合本
        {anno?.period ? ` · ${anno.period.name}` : ''}
      </p>
      {anno?.note && (
        <p className="text-xs text-gray-400 mb-6 italic">{anno.note}</p>
      )}
      <div>
        {verses.map((verse) => (
          <VerseLine key={verse.verse} verse={verse} />
        ))}
      </div>
    </div>
  )
}
