export type AppMainView = 'search' | 'my-names' | 'treasury' | 'referrals'

export type RuntimeNotice = {
  tone: 'info' | 'danger'
  message: string
}
