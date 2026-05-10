export type ActiveMenuKey =
  | 'home'
  | 'portfolio'
  | 'group'
  | 'tag-management'
  | 'strategy'
  | 'hangye'
  | 'industry-diagram'
export type GroupParams = 1 | 2
export type PortfolioMembershipScope = 'self_selected' | 'portfolio_group' | 'industry_group'
export type PortfolioAssetType = 'stock' | 'etf' | 'all'

export type StockItem = {
  code: string
  name: string
  initials: string
  search_text: string
}

export type EtfSnapshot = {
  stock_code: string
  stock_name: string
  latest_price: number | null
  latest_price_date: string | null
  daily_change_pct: number | null
  ma_metrics?: MovingAverageMetric[] | null
  analysis_error?: string | null
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'na'

export type VolumeStatusCode = 'surge' | 'expanded' | 'normal' | 'shrink' | 'na'

export type MovingAverageMetric = {
  key: string
  label: string
  price: number | null
  price_precision?: number
  bias: number | null
  slope: number | null
  trend_code: TrendDirection
  trend_label: string
}

export type VolumeMeta = {
  ratio: number | null
  status_code: VolumeStatusCode
  status_label: string | null
  status_detail: string | null
}

export type PortfolioStockItem = {
  stock_code: string
  stock_name: string
  asset_type: Exclude<PortfolioAssetType, 'all'>
  group_name: string
  group_names?: string[] | null
  portfolio_group_name?: string | null
  portfolio_group_names?: string[] | null
  industry_group_name?: string | null
  industry_group_names?: string[] | null
  is_self_selected?: boolean
  notes: string | null
  tags?: string[] | null
  added_at: string | null
  company_intro?: string | null
  industry_name?: string | null
  industry_detail?: string | null
  industry_display?: string | null
  close: number | null
  added_price: number | null
  added_price_date: string | null
  latest_price: number | null
  latest_price_date: string | null
  daily_change_pct: number | null
  portfolio_return: number | null
  vol_ratio: number | null
  volume_meta?: VolumeMeta | null
  ma_metrics?: MovingAverageMetric[] | null
  bias_str: string | null
  slope_str: string | null
  vol_status: string | null
  trend_str: string | null
  analysis_error?: string | null
}

export type PortfolioTagDefinition = {
  id: number
  name: string
  color: string
  usage_count: number
  created_at: string | null
}

export type PortfolioCustomTagItem = {
  name: string
  usage_count: number
  stocks?: AnalysisStockPreview[]
}

export type PortfolioTagOverview = {
  definitions: PortfolioTagDefinition[]
  custom_tags: PortfolioCustomTagItem[]
  tagged_stock_count: number
}

export type AnalysisStockPreview = {
  stock_code: string
  stock_name: string
  reason?: string
}

export type StockOption = {
  value: string
  label: string
  searchText: string
}
