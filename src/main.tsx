import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.redesign.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { installDataSynchronization } from './services/dataSync.ts'

installDataSynchronization()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
