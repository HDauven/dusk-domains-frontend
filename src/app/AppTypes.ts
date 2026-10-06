export type AppMainView = 'search' | 'my-names' | 'marketplace' | 'treasury' | 'referrals' | 'terms' | 'privacy'

export type RuntimeNotice = {
  tone: 'info' | 'danger'
  message: string
}
