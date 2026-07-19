import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import { loadLastPosition } from './store/readingProgress'
import './index.css'

const DEFAULT_PATH = '/exodus/14'

// 訪問根路徑時，若有上次的閱讀進度就回到那裡，否則用預設章節
function RootRedirect() {
  const last = loadLastPosition()
  return <Navigate to={last ? `/${last.bookId}/${last.chapter}` : DEFAULT_PATH} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:bookId/:chapter" element={<App />} />
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
