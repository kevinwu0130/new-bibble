import SplitScreen from './components/layout/SplitScreen'
import BookNav from './components/nav/BookNav'
import ScripturePanel from './components/reader/ScripturePanel'
import MapPanel from './components/map/MapPanel'

function App() {
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
