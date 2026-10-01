import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { DuskWalletState } from '../names/internal'
import { NamesMark } from '../components/brand/NamesMark'
import { DuskConnectControl } from '../components/wallet/DuskConnectControl'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { AppMainView } from './AppTypes'
import { PrimaryNavigation } from './PrimaryNavigation'

export type NetworkBadge = { label: string, tone: 'mainnet' | 'testnet' | 'local' | 'preview' }

export function TopBar({
  mainView,
  network,
  onMainViewChange,
  onOpenWallet,
  onSearchHome,
  pendingReservationCount,
  walletState,
  walletStatus,
}: {
  mainView: AppMainView
  network: NetworkBadge
  onMainViewChange: (view: AppMainView) => void
  onOpenWallet: () => void
  onSearchHome: () => void
  pendingReservationCount: number
  walletState: DuskWalletState
  walletStatus: WalletConnectionStatus
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (menuOpen) navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus()
  }, [menuOpen])
  useEffect(() => {
    const phoneLayout = window.matchMedia('(max-width: 900px)')
    const closeOnDesktop = () => { if (!phoneLayout.matches) setMenuOpen(false) }
    phoneLayout.addEventListener('change', closeOnDesktop)
    return () => phoneLayout.removeEventListener('change', closeOnDesktop)
  }, [])
  const closeMenu = () => {
    setMenuOpen(false)
    if (menuOpen && toggle.current?.checkVisibility()) toggle.current.focus()
  }
  return (
    <header className={`topbar${menuOpen ? ' menu-open' : ''}`} onKeyDown={event => {
      if (!menuOpen || !toggle.current?.checkVisibility()) return
      if (event.key === 'Escape') { event.preventDefault(); closeMenu() }
      if (event.key === 'Tab') {
        const links = Array.from(navigation.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])
        const targets = [...links, toggle.current].filter((target): target is HTMLAnchorElement | HTMLButtonElement => target !== null && target.checkVisibility())
        const index = targets.indexOf(document.activeElement as HTMLAnchorElement | HTMLButtonElement)
        event.preventDefault()
        targets[(index + (event.shiftKey ? targets.length - 1 : 1)) % targets.length]?.focus()
      }
    }}>
      <div className="topbar-brand">
        <a
          className="brand"
          href="/"
          aria-label="Dusk Domains home"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            onSearchHome()
          }}
        >
          <NamesMark />
          <span className="brand-name">Dusk Domains</span>
        </a>
        <Badge className={`network-badge ${network.tone}`} title={network.tone === 'preview' ? 'Preview. Live registration is unavailable.' : `Dusk ${network.label.toLowerCase()} network`}>
          {network.label}
        </Badge>
      </div>

      <div ref={navigation} id="primary-navigation" className="topbar-navigation">
        <PrimaryNavigation
          mainView={mainView}
          onMainViewChange={view => { closeMenu(); onMainViewChange(view) }}
          onSearchHome={() => { closeMenu(); onSearchHome() }}
          pendingReservationCount={pendingReservationCount}
        />
      </div>

      <DuskConnectControl
        onOpen={onOpenWallet}
        state={walletState}
        status={walletStatus}
      />
      <Button ref={toggle} className="menu-toggle" variant="quiet" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(open => !open)}>
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>
    </header>
  )
}
