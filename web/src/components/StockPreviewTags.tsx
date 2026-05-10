import { Space, Tag, Typography } from 'antd'
import type { AnalysisStockPreview } from '../types/portfolio'
import { formatStockCodeForDisplay } from '../utils/formatters/stockCodeFormat'

const { Text } = Typography

type StockPreviewTagsProps = {
  stocks?: AnalysisStockPreview[]
  emptyText: string
}

export const StockPreviewTags = ({ stocks, emptyText }: StockPreviewTagsProps) => {
  if (!stocks || stocks.length === 0) {
    return <Text type="secondary">{emptyText}</Text>
  }

  return (
    <Space size={[4, 8]} wrap>
      {stocks.map((stock) => (
        <Tag key={stock.stock_code} color="blue">
          {stock.stock_name}({formatStockCodeForDisplay(stock.stock_code)})
        </Tag>
      ))}
    </Space>
  )
}
