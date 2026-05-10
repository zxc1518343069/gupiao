import { resolvePortfolioTagColor } from "@/features/Tag/tagPalette.ts";
import { useMemo, useRef, useState } from 'react'
import { Button, Input, Popover, Space, Tag, Typography } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { PortfolioTagDefinition } from '@/types/portfolio'

const { Text } = Typography

type PortfolioTagEditorProps = {
  tags?: string[] | null
  tagDefinitions: PortfolioTagDefinition[]
  onChange: (nextTags: string[]) => Promise<void>
}

const normalizeTags = (tags: string[]) => {
  const seenTags = new Set<string>()

  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seenTags.has(tag)) {
        return false
      }

      seenTags.add(tag)
      return true
    })
}

export const PortfolioTagEditor = ({
  tags,
  tagDefinitions,
  onChange,
}: PortfolioTagEditorProps) => {
  const currentTags = useMemo(() => normalizeTags(tags ?? []), [tags])
  const [open, setOpen] = useState(false)
  const [draftTags, setDraftTags] = useState<string[]>(currentTags)
  const [customInput, setCustomInput] = useState('')
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)

  const definitionNameSet = useMemo(
    () => new Set(tagDefinitions.map((definition) => definition.name)),
    [tagDefinitions],
  )

  const customTags = useMemo(
    () => draftTags.filter((tag) => !definitionNameSet.has(tag)),
    [definitionNameSet, draftTags],
  )

  const syncDraftFromCurrent = () => {
    setDraftTags(currentTags)
    setCustomInput('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving) {
      return
    }

    if (nextOpen) {
      syncDraftFromCurrent()
    }

    setOpen(nextOpen)
  }

  const toggleTag = (tagName: string) => {
    setDraftTags((currentDraft) =>
      currentDraft.includes(tagName)
        ? currentDraft.filter((tag) => tag !== tagName)
        : [...currentDraft, tagName],
    )
  }

  const removeDraftTag = (tagName: string) => {
    setDraftTags((currentDraft) => currentDraft.filter((tag) => tag !== tagName))
  }

  const addCustomTag = () => {
    const nextTag = customInput.trim()
    if (!nextTag) {
      return
    }

    setDraftTags((currentDraft) =>
      currentDraft.includes(nextTag) ? currentDraft : [...currentDraft, nextTag],
    )
    setCustomInput('')
  }

  const saveTags = async () => {
    if (submittingRef.current) {
      return
    }

    const nextTags = normalizeTags(draftTags)
    submittingRef.current = true
    setSaving(true)

    try {
      await onChange(nextTags)
      setOpen(false)
      setCustomInput('')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const popoverContent = (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Text strong>固定标签</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {tagDefinitions.length > 0 ? (
            tagDefinitions.map((definition) => {
              const isSelected = draftTags.includes(definition.name)

              return (
                <Tag
                  key={definition.id}
                  onClick={() => toggleTag(definition.name)}
                  style={{
                    marginInlineEnd: 0,
                    cursor: 'pointer',
                    color: isSelected ? definition.color : '#595959',
                    borderColor: isSelected ? definition.color : '#d9d9d9',
                    background: isSelected ? `${definition.color}18` : '#ffffff',
                  }}
                >
                  {definition.name}
                </Tag>
              )
            })
          ) : (
            <Text type="secondary">还没有配置固定标签</Text>
          )}
        </div>
      </div>

      <div>
        <Text strong>自定义标签</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, minHeight: 32 }}>
          {customTags.length > 0 ? (
            customTags.map((tagName) => (
              <Tag
                key={tagName}
                closable
                color={resolvePortfolioTagColor(tagName, tagDefinitions)}
                onClose={(event) => {
                  event.preventDefault()
                  removeDraftTag(tagName)
                }}
                style={{ marginInlineEnd: 0 }}
              >
                {tagName}
              </Tag>
            ))
          ) : (
            <Text type="secondary">暂未补充自定义标签</Text>
          )}
        </div>
        <Space.Compact style={{ width: '100%', marginTop: 10 }}>
          <Input
            size="small"
            maxLength={18}
            placeholder="输入自定义标签"
            value={customInput}
            disabled={saving}
            onChange={(event) => setCustomInput(event.target.value)}
            onPressEnter={addCustomTag}
          />
          <Button size="small" icon={<PlusOutlined />} disabled={saving} onClick={addCustomTag}>
            添加
          </Button>
        </Space.Compact>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button size="small" disabled={saving} onClick={() => handleOpenChange(false)}>
          取消
        </Button>
        <Button type="primary" size="small" loading={saving} onClick={() => void saveTags()}>
          保存
        </Button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
        {currentTags.length > 0 ? (
          currentTags.map((tagName) => (
            <Tag
              key={tagName}
              color={resolvePortfolioTagColor(tagName, tagDefinitions)}
              style={{ marginInlineEnd: 0 }}
            >
              {tagName}
            </Tag>
          ))
        ) : (
          <Text type="secondary">未设置</Text>
        )}
      </div>

      <Popover
        trigger="click"
        placement="bottomRight"
        open={open}
        onOpenChange={handleOpenChange}
        content={popoverContent}
      >
        <Button
          type="text"
          size="small"
          icon={currentTags.length > 0 ? <EditOutlined /> : <PlusOutlined />}
          style={{ paddingInline: 8, flexShrink: 0 }}
        />
      </Popover>
    </div>
  )
}
