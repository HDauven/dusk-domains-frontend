import { AppMainContent } from './AppMainContent'
import { AppShell } from './AppShell'
import { useDuskDomainsAppModel } from './useDuskDomainsAppModel'

export function DuskDomainsApp() {
  const { mainContentProps, shellProps } = useDuskDomainsAppModel()

  return (
    <AppShell {...shellProps}>
      <AppMainContent {...mainContentProps} />
    </AppShell>
  )
}
