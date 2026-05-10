import { Button } from 'antd'
import { formatStockCodeForDisplay } from '../utils/formatters/stockCodeFormat'

type StockCodeButtonProps = {
  stockCode: string
  onCopy: (stockCode: string) => void | Promise<void>
}

export const StockCodeButton = ({ stockCode, onCopy }: StockCodeButtonProps) => (
  <Button
    type="link"
    style={{ padding: 0, height: 'auto', fontWeight: 600 }}
    onClick={() => {
      void onCopy(stockCode)
    }}
  >
    {formatStockCodeForDisplay(stockCode)}
  </Button>
)
