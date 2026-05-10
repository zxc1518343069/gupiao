import { fetchEtfList } from '../../services/etfApi'
import type { PortfolioSelectionBaseProps } from './PortfolioSelectionModal'
import { PortfolioSelectionModal } from './PortfolioSelectionModal'
import { industryGroupParams } from './constants'

export type AddEtfModalProps = PortfolioSelectionBaseProps

export const AddEtfModal = ({
  groupParams = industryGroupParams,
  membershipScope = 'industry_group',
  ...props
}: AddEtfModalProps) => (
  <PortfolioSelectionModal
    {...props}
    groupParams={groupParams}
    membershipScope={membershipScope}
    assetLabel="ETF"
    loadItems={fetchEtfList}
    modalTitle="加入行业 ETF"
    searchPlaceholder="输入代码、名称或首字母简写搜索，如 159841 或 zqetf"
  />
)
