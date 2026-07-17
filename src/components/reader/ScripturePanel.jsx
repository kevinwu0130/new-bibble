import { getAnnotation, getBookMeta, useReadingStore } from '../../store/readingStore'
import VerseLine from './VerseLine'

export default function ScripturePanel() {
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const bookData = useReadingStore((s) => s.bookData)
  const loading = useReadingStore((s) => s.loading)

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
