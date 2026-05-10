import { useState } from 'react'
import { Button, Input, Select, Space } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { PortfolioTagDefinition } from '@/types/portfolio'

export type PortfolioFilters = {
  code: string
  name: string
  tag: string
}

type PortfolioFilterPanelProps = {
  tagDefinitions: PortfolioTagDefinition[]
  onSearch: (filters: PortfolioFilters) => void
  onReset: () => void
}

export const PortfolioFilterPanel = ({
  tagDefinitions,
  onSearch,
  onReset,
}: PortfolioFilterPanelProps) => {
  const [searchCode, setSearchCode] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchTag, setSearchTag] = useState('')

  const tagOptions = tagDefinitions.map((definition) => ({
    label: definition.name,
    value: definition.name,
  }))

  const handleSearch = () => {
    onSearch({
      code: searchCode.trim(),
      name: searchName.trim(),
      tag: searchTag.trim(),
    })
  }

  const handleReset = () => {
    setSearchCode('')
    setSearchName('')
    setSearchTag('')
    onReset()
  }

  return (
    <div className="portfolio-filter-panel">
      <div className="portfolio-filter-form">
        <div className="portfolio-filter-fields">
          <label className="portfolio-filter-field">
            <span className="portfolio-filter-field__label">代码</span>
            <Input
              placeholder="例如: 601012"
              value={searchCode}
              onChange={(event) => setSearchCode(event.target.value)}
              onPressEnter={handleSearch}
            />
          </label>

          <label className="portfolio-filter-field">
            <span className="portfolio-filter-field__label">名称</span>
            <Input
              placeholder="例如: 伊戈尔"
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              onPressEnter={handleSearch}
            />
          </label>

          <div className="portfolio-filter-field">
            <span className="portfolio-filter-field__label">标签</span>
            <Select
              allowClear
              showSearch
              options={tagOptions}
              optionFilterProp="label"
              placeholder="选择或搜索标签"
              value={searchTag || undefined}
              notFoundContent="暂无固定标签"
              onChange={(value) => setSearchTag(value ?? '')}
            />
          </div>
        </div>

        <Space className="portfolio-filter-actions" size={10}>
          <Button
            className="portfolio-filter-button"
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button
            className="portfolio-filter-button"
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
        </Space>
      </div>
    </div>
  )
}
