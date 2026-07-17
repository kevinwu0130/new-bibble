import { CHAPTERS, useReadingStore } from '../../store/readingStore'

export default function BookNav() {
  const activeChapterKey = useReadingStore((s) => s.activeChapterKey)
  const setActiveChapter = useReadingStore((s) => s.setActiveChapter)

  return (
    <div className="flex gap-2 p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
      {Object.entries(CHAPTERS).map(([key, chapter]) => (
        <button
          key={key}
          onClick={() => setActiveChapter(key)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            key === activeChapterKey
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {chapter.bookZh} {chapter.chapter}
        </button>
      ))}
    </div>
  )
}
