import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { ToastProvider } from './components/feedback/Toasts'
import Launcher from './pages/Launcher'
import DocumentView from './modules/document/DocumentView'
import SpreadsheetView from './modules/spreadsheet/SpreadsheetView'

/** Shell de la aplicación: proveedores globales y rutas (hash para archivos locales). */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <div className="h-screen w-screen overflow-hidden">
            <Routes>
              <Route path="/" element={<Launcher />} />
              <Route path="/document/:id" element={<DocumentView />} />
              <Route path="/spreadsheet/:id" element={<SpreadsheetView />} />
              <Route path="*" element={<Launcher />} />
            </Routes>
          </div>
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}