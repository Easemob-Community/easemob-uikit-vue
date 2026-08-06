export type StatusBannerType = 'info' | 'warning' | 'error' | 'success'

export interface StatusBannerItem {
  type: StatusBannerType
  loading?: boolean
  icon?: string
  title?: string
  description?: string
}
