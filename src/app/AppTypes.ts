export type AppMainView = 'search' | 'my-names' | 'marketplace' | 'treasury' | 'referrals'

export type RuntimeNotice = {
  tone: 'info' | 'danger'
  message: string
}
