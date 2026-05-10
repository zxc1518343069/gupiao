import { useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { AddStockModal } from '../../AddStockModal'
import { defaultGroupName, portfolioGroupParams } from '../../constants'
import type { GroupParams, PortfolioMembershipScope } from '../../../../types/portfolio'

type PortfolioAddStockActionProps = {
  groupName?: string
  groupParams?: GroupParams
  onAdded: () => void
}

export const PortfolioAddStockAction = ({
  groupName,
  groupParams = portfolioGroupParams,
  onAdded,
}: PortfolioAddStockActionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isGroupView = Boolean(groupName)
  const targetGroupName =
    groupName || (groupParams === portfolioGroupParams ? defaultGroupName : undefined)
  const membershipScope: PortfolioMembershipScope =
    groupParams !== portfolioGroupParams
      ? 'industry_group'
      : groupName
        ? 'portfolio_group'
        : 'self_selected'

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleAdded = () => {
    closeModal()
    onAdded()
  }

  return (
    <>
      <Button
        type={isGroupView ? 'default' : 'primary'}
        icon={<PlusOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        {isGroupView ? '增加股票' : groupParams === portfolioGroupParams ? '新增自选股票' : '新增行业股票'}
      </Button>
      {isModalOpen ? (
        <AddStockModal
          open={isModalOpen}
          initialGroupName={targetGroupName}
          groupParams={groupParams}
          membershipScope={membershipScope}
          onAdded={handleAdded}
          onCancel={closeModal}
        />
      ) : null}
    </>
  )
}
