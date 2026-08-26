import './App.css'
import { AppMainContent } from './app/AppMainContent'
import { AppShell } from './app/AppShell'
import { useDuskDomainsAppModel } from './app/useDuskDomainsAppModel'

export default function App() {
  const { mainContentProps, shellProps } = useDuskDomainsAppModel()

  return (
    <AppShell {...shellProps}>
      <AppMainContent {...mainContentProps} />
    </AppShell>
  )
}
