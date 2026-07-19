import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SplitScreen from './components/layout/SplitScreen'
import BookNav from './components/nav/BookNav'
import ScripturePanel from './components/reader/ScripturePanel'
import MapPanel from './components/map/MapPanel'
import { getBookMeta, useReadingStore } from './store/readingStore'

const DEFAULT_PATH = '/exodus/14'

function App() {
  const { bookId, chapter } = useParams()
  const navigate = useNavigate()
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const setLocation = useReadingStore((s) => s.setLocation)

  // 網址是唯一真相來源：初次載入、瀏覽器上一頁/下一頁、或貼上分享連結都在這裡同步進 store
  useEffect(() => {
    const meta = getBookMeta(bookId)
    const chapterNum = Number(chapter)
    if (!meta || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > meta.chapterCount) {
      navigate(DEFAULT_PATH, { replace: true })
      return
    }
    if (bookId !== activeBookId || chapterNum !== activeChapter) {
      setLocation(bookId, chapterNum)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapter])

  return (
    <SplitScreen
      left={
        <>
          <BookNav />
          <ScripturePanel />
        </>
      }
      right={<MapPanel />}
    />
  )
}

export default App
