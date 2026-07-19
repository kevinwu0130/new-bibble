import { useReadingStore } from '../../store/readingStore'

// 依 highlights 的 anchorText 把整句經文切成一段段 plain text / highlighted span
function splitByHighlights(text, highlights) {
  if (!highlights || highlights.length === 0) return [{ text, entityId: null }]

  const points = []
  for (const h of highlights) {
    const idx = text.indexOf(h.anchorText)
    if (idx === -1) continue
    points.push({ start: idx, end: idx + h.anchorText.length, entityId: h.entityId })
  }
  points.sort((a, b) => a.start - b.start)

  const segments = []
  let cursor = 0
  for (const p of points) {
    if (p.start < cursor) continue // 避免重疊
    if (p.start > cursor) segments.push({ text: text.slice(cursor, p.start), entityId: null })
    segments.push({ text: text.slice(p.start, p.end), entityId: p.entityId })
    cursor = p.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), entityId: null })
  return segments
}

export default function VerseLine({ verse }) {
  const activeEntityId = useReadingStore((s) => s.activeEntityId)
  const setActiveEntity = useReadingStore((s) => s.setActiveEntity)
  const segments = splitByHighlights(verse.text, verse.highlights)

  return (
    <div id={`verse-${verse.verse}`} className="mb-3">
      <p className="leading-relaxed text-gray-800">
        <span className="text-xs align-super text-gray-400 mr-1">{verse.verse}</span>
        {segments.map((seg, i) =>
          seg.entityId ? (
            <span
              key={i}
              onMouseEnter={() => setActiveEntity(seg.entityId)}
              onClick={() => setActiveEntity(seg.entityId)}
              className={`cursor-pointer rounded px-0.5 transition-colors ${
                activeEntityId === seg.entityId
                  ? 'bg-amber-300'
                  : 'bg-amber-100 hover:bg-amber-200'
              }`}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
      {verse.englishText && (
        <p className="leading-snug text-gray-400 text-sm italic mt-0.5">{verse.englishText}</p>
      )}
    </div>
  )
}
