import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Leaflet CSS must be imported before any Leaflet component renders
import 'leaflet/dist/leaflet.css'
import './index.css'

import App from './App.tsx'
import { SharedReportPage } from './pages/SharedReportPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/report/:id" element={<SharedReportPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
