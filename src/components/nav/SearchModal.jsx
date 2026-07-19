import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchVerses } from '../../store/searchIndex'

const DEBOUNCE_MS = 200

function highlightMatch(text, q) {
  const idx = text.indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export default function SearchModal({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | searching | done
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setResults([])
      setStatus('idle')
      return
    }
    setStatus('searching')
    debounceRef.current = setTimeout(async () => {
      const r = await searchVerses(q, 50)
      setResults(r)
      setStatus('done')
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (item) => {
    navigate(`/${item.bookId}/${item.chapter}`, { state: { scrollToVerse: item.verse } })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-gray-200">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="搜尋經文關鍵字…（Esc 關閉）"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {status === 'searching' && <p className="p-4 text-sm text-gray-400">搜尋中…</p>}
          {status === 'done' && results.length === 0 && (
            <p className="p-4 text-sm text-gray-400">沒有找到符合的經文</p>
          )}
          {results.map((item) => (
            <button
              key={`${item.bookId}-${item.chapter}-${item.verse}`}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="text-xs font-medium text-indigo-600 mb-0.5">
                {item.bookName} {item.chapter}:{item.verse}
              </p>
              <p className="text-sm text-gray-700 leading-snug">{highlightMatch(item.text, query.trim())}</p>
            </button>
          ))}
          {status === 'done' && results.length === 50 && (
            <p className="p-3 text-xs text-gray-400 text-center">僅顯示前 50 筆結果，請輸入更精確的關鍵字</p>
          )}
        </div>
      </div>
    </div>
  )
}
