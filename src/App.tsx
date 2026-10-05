import './App.css'
import { AppMainContent } from './app/AppMainContent'
import { AppShell } from './app/AppShell'
import { useStaticShellHandoff } from './app/staticShell'
import { useDuskDomainsAppModel } from './app/useDuskDomainsAppModel'

export default function App() {
  const { mainContentProps, shellProps } = useDuskDomainsAppModel()
  // After the model, so its route effect has reset the search box before typed text returns.
  useStaticShellHandoff()

  return (
    <AppShell {...shellProps}>
      <AppMainContent {...mainContentProps} />
    </AppShell>
  )
}
