import { BOOKS, ANNOTATIONS, getBookMeta, useReadingStore } from '../../store/readingStore'

const OT_BOOKS = BOOKS.filter((b) => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter((b) => b.testament === 'NT')

export default function BookNav() {
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const setLocation = useReadingStore((s) => s.setLocation)
  const stepChapter = useReadingStore((s) => s.stepChapter)

  const meta = getBookMeta(activeBookId)
  const chapterCount = meta?.chapterCount ?? 1

  return (
    <div className="p-3 border-b border-gray-200 bg-white sticky top-0 z-10 space-y-2">
      <div className="flex gap-2 items-center">
        <select
          value={activeBookId}
          onChange={(e) => setLocation(e.target.value, 1)}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
        >
          <optgroup label="舊約">
            {OT_BOOKS.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </optgroup>
          <optgroup label="新約">
            {NT_BOOKS.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </optgroup>
        </select>

        <select
          value={activeChapter}
          onChange={(e) => setLocation(activeBookId, Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
        >
          {Array.from({ length: chapterCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} 章</option>
          ))}
        </select>

        <button
          onClick={() => stepChapter(-1)}
          disabled={activeChapter <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-100"
          aria-label="上一章"
        >
          ‹
        </button>
        <button
          onClick={() => stepChapter(1)}
          disabled={activeChapter >= chapterCount}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-100"
          aria-label="下一章"
        >
          ›
        </button>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs text-gray-400">地圖章節：</span>
        {Object.values(ANNOTATIONS).map((a) => {
          const bookMeta = getBookMeta(a.bookId)
          const isActive = a.bookId === activeBookId && a.chapter === activeChapter
          return (
            <button
              key={`${a.bookId}-${a.chapter}`}
              onClick={() => setLocation(a.bookId, a.chapter)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {bookMeta.abbr} {a.chapter} 🗺
            </button>
          )
        })}
      </div>
    </div>
  )
}
