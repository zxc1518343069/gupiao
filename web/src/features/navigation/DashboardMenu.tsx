import { useCallback, useEffect, useState } from 'react'
import { Button, Menu, Modal, message, type MenuProps } from 'antd'
import { industryGroupParams, portfolioGroupParams } from '../portfolio/constants'
import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  HomeOutlined,
  PlusOutlined,
  SlidersOutlined,
  StarOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { deletePortfolioGroup, fetchPortfolioGroups } from '../../services/portfolioApi'
import type { ActiveMenuKey, GroupParams } from '../../types/portfolio'
import { PortfolioGroupModal, type PortfolioGroupModalResult } from './PortfolioGroupModal'

type GroupModalState =
  | { mode: 'create'; params: GroupParams }
  | { mode: 'rename'; groupName: string; params: GroupParams }

type DashboardMenuProps = {
  activeMenu: ActiveMenuKey
  selectedGroup: string
  selectedGroupParams: GroupParams
  onMenuClick: (key: string) => void
}

export const DashboardMenu = ({
  activeMenu,
  selectedGroup,
  selectedGroupParams,
  onMenuClick,
}: DashboardMenuProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [groupModalState, setGroupModalState] = useState<GroupModalState | null>(null)
  const [portfolioGroups, setPortfolioGroups] = useState<string[]>([])
  const [industryGroups, setIndustryGroups] = useState<string[]>([])

  const reloadGroups = useCallback(async () => {
    const [nextPortfolioGroups, nextIndustryGroups] = await Promise.all([
      fetchPortfolioGroups(portfolioGroupParams),
      fetchPortfolioGroups(industryGroupParams),
    ])
    setPortfolioGroups(nextPortfolioGroups)
    setIndustryGroups(nextIndustryGroups)
  }, [])

  useEffect(() => {
    Promise.resolve()
      .then(reloadGroups)
      .catch((error: Error) => {
        messageApi.error(error.message)
      })
  }, [messageApi, reloadGroups])

  const closeGroupModal = () => {
    setGroupModalState(null)
  }

  const handleGroupSubmitted = (result: PortfolioGroupModalResult) => {
    if (result.mode === 'create') {
      messageApi.success(`分组 ${result.groupName} 创建成功`)
      void reloadGroups()
      onMenuClick(
        result.params === portfolioGroupParams
          ? `portfolio-group-${result.groupName}`
          : `industry-group-${result.groupName}`,
      )
      return
    }

    messageApi.success(`分组已修改为 ${result.groupName}`)
    void reloadGroups()
    const isSelectedPortfolioGroup =
      activeMenu === 'group' &&
      selectedGroupParams === portfolioGroupParams &&
      selectedGroup === result.previousGroupName
    const isSelectedIndustryGroup =
      activeMenu === 'hangye' &&
      selectedGroupParams === industryGroupParams &&
      selectedGroup === result.previousGroupName

    if (isSelectedPortfolioGroup || isSelectedIndustryGroup) {
      onMenuClick(
        result.params === portfolioGroupParams
          ? `portfolio-group-${result.groupName}`
          : `industry-group-${result.groupName}`,
      )
    }
  }

  const deleteGroup = async (groupName: string, params: GroupParams) => {
    try {
      await deletePortfolioGroup(groupName, params)
      await reloadGroups()
      messageApi.success(`分组 ${groupName} 已删除`)

      const isSelectedPortfolioGroup =
        activeMenu === 'group' &&
        selectedGroupParams === portfolioGroupParams &&
        selectedGroup === groupName
      const isSelectedIndustryGroup =
        activeMenu === 'hangye' &&
        selectedGroupParams === industryGroupParams &&
        selectedGroup === groupName

      if (isSelectedPortfolioGroup) {
        onMenuClick('portfolio')
      }

      if (isSelectedIndustryGroup) {
        onMenuClick('hangye')
      }
    } catch (err) {
      const error = err as Error
      messageApi.error(error.message)
    }
  }

  const confirmDeleteGroup = (groupName: string, params: GroupParams) => {
    Modal.confirm({
      title: `确认删除分组“${groupName}”吗？`,
      content:
        params === portfolioGroupParams
          ? '删除后，已有自选归属的股票会保留在自选；仅属于该分组的股票会被移除。'
          : '删除后，该行业分组归属会被移除；若股票没有其他归属，也会一并移除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteGroup(groupName, params),
    })
  }

  const selectedMenuKey = (() => {
    if (
      activeMenu === 'group' &&
      selectedGroupParams === portfolioGroupParams &&
      portfolioGroups.includes(selectedGroup)
    ) {
      return `portfolio-group-${selectedGroup}`
    }

    if (
      activeMenu === 'hangye' &&
      selectedGroupParams === industryGroupParams &&
      industryGroups.includes(selectedGroup)
    ) {
      return `industry-group-${selectedGroup}`
    }

    return activeMenu
  })()

  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: 'portfolio',
      icon: <StarOutlined />,
      label: '自选',
    },
    {
      key: 'tag-management',
      icon: <TagsOutlined />,
      label: '标签管理',
    },
    {
      key: 'strategy',
      icon: <SlidersOutlined />,
      label: '策略',
    },
    {
      key: 'groups-root',
      icon: <FolderOutlined />,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <span>推票</span>
          <PlusOutlined
            onClick={(event) => {
              event.stopPropagation()
              setGroupModalState({ mode: 'create', params: portfolioGroupParams })
            }}
            style={{ padding: '4px' }}
          />
        </div>
      ),
      children: portfolioGroups.map((groupName) => ({
        key: `portfolio-group-${groupName}`,
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {groupName}
            </span>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  setGroupModalState({
                    mode: 'rename',
                    groupName,
                    params: portfolioGroupParams,
                  })
                }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  confirmDeleteGroup(groupName, portfolioGroupParams)
                }}
              />
            </div>
          </div>
        ),
      })),
    },
    {
      key: 'hangye',
      icon: <FolderOutlined />,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <span>行业</span>
          <PlusOutlined
            onClick={(event) => {
              event.stopPropagation()
              setGroupModalState({ mode: 'create', params: industryGroupParams })
            }}
            style={{ padding: '4px' }}
          />
        </div>
      ),
      children: [
        {
          key: 'industry-diagram',
          label: '图示化',
        },
        ...industryGroups.map((groupName) => ({
          key: `industry-group-${groupName}`,
          label: (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {groupName}
              </span>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    setGroupModalState({
                      mode: 'rename',
                      groupName,
                      params: industryGroupParams,
                    })
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    confirmDeleteGroup(groupName, industryGroupParams)
                  }}
                />
              </div>
            </div>
          ),
        })),
      ],
    },
  ]

  return (
    <>
      {contextHolder}
      <Menu
        mode="inline"
        selectedKeys={[selectedMenuKey]}
        defaultOpenKeys={['groups-root', 'hangye']}
        onClick={({ key }) => onMenuClick(key)}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
      {groupModalState ? (
        <PortfolioGroupModal
          key={groupModalState.mode === 'rename' ? `rename-${groupModalState.groupName}` : 'create'}
          open
          mode={groupModalState.mode}
          params={groupModalState.params}
          groupName={groupModalState.mode === 'rename' ? groupModalState.groupName : undefined}
          onSubmitted={handleGroupSubmitted}
          onCancel={closeGroupModal}
        />
      ) : null}
    </>
  )
}
