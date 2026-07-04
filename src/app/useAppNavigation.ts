import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { AppMainView } from './AppTypes'

type UseAppNavigationArgs = {
  loadMyNames: () => Promise<unknown>
  loadReferralAccount: () => Promise<unknown>
  loadTreasuryView: () => Promise<boolean>
  resetReferralCopied: () => void
  setMainView: Dispatch<SetStateAction<AppMainView>>
}

export function useAppNavigation({
  loadMyNames,
  loadReferralAccount,
  loadTreasuryView,
  resetReferralCopied,
  setMainView,
}: UseAppNavigationArgs) {
  const handleMainViewChange = useCallback(async (nextView: AppMainView) => {
    setMainView(nextView)
    if (nextView === 'my-names') await loadMyNames()
    if (nextView === 'treasury') await loadTreasuryView()
    if (nextView === 'referrals') {
      resetReferralCopied()
      await loadReferralAccount()
    }
  }, [loadMyNames, loadReferralAccount, loadTreasuryView, resetReferralCopied, setMainView])

  return {
    handleMainViewChange,
    loadTreasuryView,
  }
}
