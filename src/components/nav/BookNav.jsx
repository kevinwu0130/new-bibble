import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BOOKS, ANNOTATIONS, getBookMeta, useReadingStore } from '../../store/readingStore'
import SearchModal from './SearchModal'

const OT_BOOKS = BOOKS.filter((b) => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter((b) => b.testament === 'NT')

export default function BookNav() {
  const navigate = useNavigate()
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const translationMode = useReadingStore((s) => s.translationMode)
  const setTranslationMode = useReadingStore((s) => s.setTranslationMode)
  const [searchOpen, setSearchOpen] = useState(false)

  const meta = getBookMeta(activeBookId)
  const chapterCount = meta?.chapterCount ?? 1

  // 「/」快捷鍵開啟搜尋（輸入框內或已開啟時不觸發）
  useEffect(() => {
    function handleKeydown(e) {
      if (e.key !== '/' || searchOpen) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [searchOpen])

  return (
    <div className="p-3 border-b border-gray-200 bg-white sticky top-0 z-10 space-y-2">
      <div className="flex gap-2 items-center">
        <select
          value={activeBookId || ''}
          onChange={(e) => navigate(`/${e.target.value}/1`)}
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
          value={activeChapter || 1}
          onChange={(e) => navigate(`/${activeBookId}/${Number(e.target.value)}`)}
          className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
        >
          {Array.from({ length: chapterCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} 章</option>
          ))}
        </select>

        <button
          onClick={() => navigate(`/${activeBookId}/${activeChapter - 1}`)}
          disabled={activeChapter <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-100"
          aria-label="上一章"
        >
          ‹
        </button>
        <button
          onClick={() => navigate(`/${activeBookId}/${activeChapter + 1}`)}
          disabled={activeChapter >= chapterCount}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-100"
          aria-label="下一章"
        >
          ›
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
          aria-label="搜尋經文"
          title="搜尋經文（快捷鍵：/）"
        >
          🔍
        </button>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs text-gray-400">地圖章節：</span>
        {Object.values(ANNOTATIONS)
          .sort((a, b) =>
            getBookMeta(a.bookId).order - getBookMeta(b.bookId).order || a.chapter - b.chapter
          )
          .map((a) => {
          const bookMeta = getBookMeta(a.bookId)
          const isActive = a.bookId === activeBookId && a.chapter === activeChapter
          return (
            <button
              key={`${a.bookId}-${a.chapter}`}
              onClick={() => navigate(`/${a.bookId}/${a.chapter}`)}
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

      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-400">版本：</span>
        <button
          onClick={() => setTranslationMode('cuv')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            translationMode === 'cuv'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          和合本
        </button>
        <button
          onClick={() => setTranslationMode('parallel')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            translationMode === 'parallel'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          中英對照（WEB）
        </button>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
