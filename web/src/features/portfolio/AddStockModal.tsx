import { fetchStockList } from '../../services/stockApi'
import type { PortfolioSelectionBaseProps } from './PortfolioSelectionModal'
import { PortfolioSelectionModal } from './PortfolioSelectionModal'
import { portfolioGroupParams } from './constants'

export type AddStockModalProps = PortfolioSelectionBaseProps

export const AddStockModal = ({
  groupParams = portfolioGroupParams,
  ...props
}: AddStockModalProps) => (
  <PortfolioSelectionModal
    {...props}
    groupParams={groupParams}
    assetLabel="股票"
    loadItems={fetchStockList}
    modalTitle={groupParams === portfolioGroupParams ? '加入自选' : '加入行业'}
    searchPlaceholder="输入代码、名称或首字母简写搜索，如 zjxc"
  />
)
