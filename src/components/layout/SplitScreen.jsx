import { useCallback, useRef, useState } from 'react'
import {
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  loadRightCollapsed,
  loadSplitRatio,
  saveRightCollapsed,
  saveSplitRatio,
} from '../../store/layoutPreference'

const COLLAPSED_SIZE = 40 // px：收合時地圖／插圖區塊留下的細條高度或寬度
const MD_BREAKPOINT = 768 // 對應 Tailwind 的 md:

export default function SplitScreen({ left, right }) {
  const [ratio, setRatio] = useState(loadSplitRatio) // 右／下方（地圖）區塊佔比
  const [collapsed, setCollapsed] = useState(loadRightCollapsed)
  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  const updateRatioFromPointer = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const isRow = window.innerWidth >= MD_BREAKPOINT
    const next = isRow
      ? (rect.right - clientX) / rect.width
      : (rect.bottom - clientY) / rect.height
    setRatio(Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, next)))
  }, [])

  const handlePointerDown = useCallback((e) => {
    draggingRef.current = true
    setCollapsed(false)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    updateRatioFromPointer(e.clientX, e.clientY)
  }, [updateRatioFromPointer])

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setRatio((r) => {
      saveSplitRatio(r)
      return r
    })
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      saveRightCollapsed(next)
      return next
    })
  }, [])

  const rightBasis = collapsed ? `${COLLAPSED_SIZE}px` : `${ratio * 100}%`

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen flex flex-col md:flex-row overflow-hidden select-none"
    >
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200">
        {left}
      </div>

      {/* 拖曳把手：可拉伸調整比例，中間按鈕可一鍵收合／展開地圖區塊 */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="shrink-0 bg-gray-100 hover:bg-gray-200 flex items-center justify-center relative z-10 h-3 md:h-auto md:w-3 cursor-row-resize md:cursor-col-resize touch-none"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-gray-300 h-1 w-8 md:h-8 md:w-1" />
        </div>
        {/* 按鈕故意偏離正中央，避免擋住拖曳把手最自然的抓取點 */}
        <button
          onClick={toggleCollapsed}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-4 top-1/2 -translate-y-1/2 md:right-auto md:top-4 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 px-2 py-0.5 rounded-full bg-white border border-gray-300 shadow-sm text-[10px] text-gray-500 hover:bg-gray-50 whitespace-nowrap"
          aria-label={collapsed ? '展開地圖／插圖' : '收合地圖／插圖'}
          title={collapsed ? '展開地圖／插圖' : '收合地圖／插圖'}
        >
          {collapsed ? '展開地圖 ▴' : '收合地圖 ▾'}
        </button>
      </div>

      <div
        style={{ flexBasis: rightBasis }}
        className="w-full md:h-full shrink-0 overflow-hidden relative"
      >
        {right}
      </div>
    </div>
  )
}
