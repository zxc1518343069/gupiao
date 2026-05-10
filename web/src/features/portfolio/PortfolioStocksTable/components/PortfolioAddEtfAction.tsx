import { useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { AddEtfModal } from '../../AddEtfModal'
import { industryGroupParams, maxIndustryGroupEtfCount } from '../../constants'
import type { GroupParams } from '../../../../types/portfolio'

type PortfolioAddEtfActionProps = {
  disabled?: boolean
  groupName?: string
  groupParams?: GroupParams
  onAdded: () => void
}

export const PortfolioAddEtfAction = ({
  disabled = false,
  groupName,
  groupParams = industryGroupParams,
  onAdded,
}: PortfolioAddEtfActionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isGroupView = Boolean(groupName)

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleAdded = () => {
    closeModal()
    onAdded()
  }
  const buttonLabel = isGroupView ? '增加ETF' : '新增ETF'

  return (
    <>
      <Tooltip title={disabled ? `当前行业最多添加 ${maxIndustryGroupEtfCount} 个 ETF` : undefined}>
        <span>
          <Button disabled={disabled} icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            {buttonLabel}
          </Button>
        </span>
      </Tooltip>
      {isModalOpen ? (
        <AddEtfModal
          open={isModalOpen}
          initialGroupName={groupName}
          groupParams={groupParams}
          onAdded={handleAdded}
          onCancel={closeModal}
        />
      ) : null}
    </>
  )
}
