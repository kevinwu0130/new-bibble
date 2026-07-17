import { CHAPTERS, useReadingStore } from '../../store/readingStore'
import VerseLine from './VerseLine'

export default function ScripturePanel() {
  const activeChapterKey = useReadingStore((s) => s.activeChapterKey)
  const chapter = CHAPTERS[activeChapterKey]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">{chapter.titleZh}</h1>
      <p className="text-sm text-gray-400 mb-1">
        {chapter.bookZh} {chapter.chapter} 章 · {chapter.translation} · {chapter.period.name}
      </p>
      {chapter.note && (
        <p className="text-xs text-gray-400 mb-6 italic">{chapter.note}</p>
      )}
      <div>
        {chapter.verses.map((verse) => (
          <VerseLine key={verse.verse} verse={verse} />
        ))}
      </div>
    </div>
  )
}
