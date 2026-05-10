import { useEffect, useMemo, useState } from 'react'
import { Input, Modal, Select, Typography, message } from 'antd'
import { addPortfolioStocks, fetchPortfolioGroups } from '../../services/portfolioApi'
import type {
  GroupParams,
  PortfolioMembershipScope,
  StockItem,
  StockOption,
} from '../../types/portfolio'
import { formatStockCodeForDisplay } from '../../utils/formatters/stockCodeFormat'
import { defaultGroupName, portfolioGroupParams } from './constants'

const { Text } = Typography

export type PortfolioSelectionBaseProps = {
  open: boolean
  initialGroupName?: string
  groupParams?: GroupParams
  membershipScope?: PortfolioMembershipScope
  onAdded: () => void
  onCancel: () => void
}

type PortfolioSelectionModalProps = PortfolioSelectionBaseProps & {
  assetLabel: string
  loadItems: () => Promise<StockItem[]>
  modalTitle: string
  searchPlaceholder: string
}

const getInitialGroupValue = (initialGroupName?: string, groupParams?: GroupParams) =>
  initialGroupName ?? (groupParams === portfolioGroupParams ? defaultGroupName : '')

export const PortfolioSelectionModal = ({
  open,
  initialGroupName,
  groupParams = portfolioGroupParams,
  membershipScope = 'self_selected',
  onAdded,
  onCancel,
  assetLabel,
  loadItems,
  modalTitle,
  searchPlaceholder,
}: PortfolioSelectionModalProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [items, setItems] = useState<StockItem[]>([])
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState(
    getInitialGroupValue(initialGroupName, groupParams),
  )
  const [newGroupName, setNewGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [groupOptions, setGroupOptions] = useState<string[]>(
    groupParams === portfolioGroupParams ? [defaultGroupName] : [],
  )

  const groupLabel = groupParams === portfolioGroupParams ? '选择分组：' : '选择行业分组：'
  const newGroupLabel =
    groupParams === portfolioGroupParams ? '或输入新分组名称：' : '或输入新行业分组名称：'

  useEffect(() => {
    if (!open || items.length > 0) {
      return
    }

    loadItems()
      .then(setItems)
      .catch((error: Error) => messageApi.error(error.message))
  }, [items.length, loadItems, messageApi, open])

  useEffect(() => {
    if (!open) {
      return
    }

    fetchPortfolioGroups(groupParams)
      .then((groups) => {
        const nextGroupOptions =
          groupParams === portfolioGroupParams ? [defaultGroupName, ...groups] : groups
        setGroupOptions(nextGroupOptions)

        if (!initialGroupName && groupParams !== portfolioGroupParams && groups.length > 0) {
          setSelectedGroup((currentGroup) => currentGroup || groups[0])
        }
      })
      .catch((error: Error) => messageApi.error(error.message))
  }, [groupParams, initialGroupName, messageApi, open])

  const itemOptions = useMemo<StockOption[]>(
    () =>
      items.map((item) => ({
        value: item.code,
        label: `${item.name} (${formatStockCodeForDisplay(item.code)})`,
        searchText: item.search_text,
      })),
    [items],
  )

  const resetModal = () => {
    setSelectedCodes([])
    setSelectedGroup(getInitialGroupValue(initialGroupName, groupParams))
    setNewGroupName('')
  }

  const closeModal = () => {
    resetModal()
    onCancel()
  }

  const confirmAdd = async () => {
    if (selectedCodes.length === 0) {
      messageApi.warning(`请至少选择一个${assetLabel}`)
      return
    }

    const finalGroup = newGroupName.trim() || selectedGroup
    if (!finalGroup) {
      messageApi.warning(groupParams === portfolioGroupParams ? '请选择或输入分组名称' : '请选择或输入行业分组名称')
      return
    }

    const selectedItems = items
      .filter((item) => selectedCodes.includes(item.code))
      .map((item) => ({
        stock_code: item.code,
        stock_name: item.name,
      }))

    setSubmitting(true)
    try {
      const result = await addPortfolioStocks(selectedItems, finalGroup, groupParams, membershipScope)
      const addedCount = result.added_count ?? 0
      const skippedCount = result.skipped_count ?? 0

      if (addedCount > 0) {
        messageApi.success(
          `已加入 ${addedCount} 个${assetLabel}到 ${finalGroup}${skippedCount ? `，跳过 ${skippedCount} 个` : ''}`,
        )
      } else {
        messageApi.warning(`没有新增${assetLabel}，跳过 ${skippedCount} 个`)
      }

      if (newGroupName.trim()) {
        const groups = await fetchPortfolioGroups(groupParams)
        setGroupOptions(groupParams === portfolioGroupParams ? [defaultGroupName, ...groups] : groups)
      }

      resetModal()
      onAdded()
    } catch (error) {
      const nextError = error as Error
      messageApi.error(nextError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={modalTitle}
        open={open}
        onOk={() => {
          void confirmAdd()
        }}
        onCancel={closeModal}
        okText="确定"
        cancelText="取消"
        confirmLoading={submitting}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>{`搜索${assetLabel}：`}</Text>
          <Select
            mode="multiple"
            showSearch
            maxTagCount="responsive"
            style={{ width: '100%', marginTop: '8px' }}
            placeholder={searchPlaceholder}
            value={selectedCodes}
            onChange={setSelectedCodes}
            options={itemOptions}
            filterOption={(input, option) =>
              String((option as StockOption | undefined)?.searchText ?? '').includes(
                input.trim().toLowerCase(),
              )
            }
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>{groupLabel}</Text>
          <Select
            style={{ width: '100%', marginTop: '8px' }}
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={groupOptions.map((groupName) => ({ value: groupName, label: groupName }))}
          />
        </div>
        <div>
          <Text strong>{newGroupLabel}</Text>
          <Input
            style={{ marginTop: '8px' }}
            placeholder={
              groupParams === portfolioGroupParams
                ? '如果输入，将优先创建并加入此新分组'
                : '如果输入，将优先创建并加入此行业分组'
            }
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            onPressEnter={() => {
              void confirmAdd()
            }}
          />
        </div>
      </Modal>
    </>
  )
}
