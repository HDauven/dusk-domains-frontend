export type AppMainView = 'search' | 'my-names' | 'marketplace' | 'treasury' | 'referrals' | 'terms' | 'privacy' | 'developers'

export type RuntimeNotice = {
  tone: 'info' | 'danger'
  message: string
}
