import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchStaticShell } from './app/staticShell'

const container = document.getElementById('root')!
watchStaticShell(container)
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
