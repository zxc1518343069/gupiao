import { CopyOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { formatStockCodeForDisplay } from '../../../../utils/formatters/stockCodeFormat'

type PortfolioStockIdentityCellProps = {
  stockCode: string
  stockName: string
  industryDisplay?: string | null
  companyIntro?: string | null
  onCopy: (stockCode: string) => void | Promise<void>
}

export const PortfolioStockIdentityCell = ({
  stockCode,
  stockName,
  industryDisplay,
  companyIntro,
  onCopy,
}: PortfolioStockIdentityCellProps) => {
  const displayStockCode = formatStockCodeForDisplay(stockCode)

  return (
    <div className="portfolio-stock-cell">
      <div className="portfolio-stock-cell__header">
        <span className="portfolio-stock-cell__name" title={stockName}>
          {stockName}
        </span>
        <Button
          type="text"
          size="small"
          className="portfolio-stock-cell__code-button"
          icon={<CopyOutlined />}
          title={`点击复制代码 ${displayStockCode}`}
          onClick={() => {
            void onCopy(stockCode)
          }}
        >
          <span className="portfolio-stock-cell__code-text">{displayStockCode}</span>
        </Button>
      </div>
      {industryDisplay ? (
        <div className="portfolio-stock-cell__industry" title={industryDisplay}>
          {industryDisplay}
        </div>
      ) : null}
      {companyIntro ? (
        <div className="portfolio-stock-cell__intro" title={companyIntro}>
          {companyIntro}
        </div>
      ) : null}
    </div>
  )
}
