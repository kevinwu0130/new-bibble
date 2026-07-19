import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

const DEFAULT_PATH = '/exodus/14'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
        <Route path="/:bookId/:chapter" element={<App />} />
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
