import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchStaticShell } from './app/staticShell'
import { RootErrorBoundary } from './components/status/ViewErrorBoundary'

const container = document.getElementById('root')!
watchStaticShell(container)
createRoot(container).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
