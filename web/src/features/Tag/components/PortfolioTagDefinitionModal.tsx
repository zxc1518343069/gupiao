import { useState } from 'react'
import { Button, Input, Modal, Typography } from 'antd'
import { portfolioTagPalette } from '../tagPalette'

const { Text } = Typography

export type PortfolioTagDefinitionDraft = {
  name: string
  color: string
}

type PortfolioTagDefinitionModalProps = {
  open: boolean
  title: string
  confirmText: string
  submitting: boolean
  initialValue?: PortfolioTagDefinitionDraft | null
  onCancel: () => void
  onSubmit: (draft: PortfolioTagDefinitionDraft) => Promise<void>
}

const defaultDraft: PortfolioTagDefinitionDraft = {
  name: '',
  color: portfolioTagPalette[0],
}

export const PortfolioTagDefinitionModal = ({
  open,
  title,
  confirmText,
  submitting,
  initialValue,
  onCancel,
  onSubmit,
}: PortfolioTagDefinitionModalProps) => {
  const [draft, setDraft] = useState<PortfolioTagDefinitionDraft>(initialValue ?? defaultDraft)

  const submitDefinition = async () => {
    await onSubmit({
      name: draft.name.trim(),
      color: draft.color,
    })
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => {
        void submitDefinition()
      }}
      onCancel={onCancel}
      okText={confirmText}
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text strong>标签名称</Text>
          <Input
            autoFocus
            maxLength={18}
            placeholder="例如：材料"
            value={draft.name}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                name: event.target.value,
              }))
            }
            onPressEnter={() => {
              void submitDefinition()
            }}
            style={{ marginTop: 8 }}
          />
        </div>

        <div>
          <Text strong>标签颜色</Text>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 10,
            }}
          >
            {portfolioTagPalette.map((color) => {
              const isActive = color === draft.color

              return (
                <Button
                  key={color}
                  type="text"
                  aria-label={`select-${color}`}
                  onClick={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      color,
                    }))
                  }
                  style={{
                    width: 34,
                    minWidth: 34,
                    height: 34,
                    padding: 0,
                    borderRadius: 999,
                    border: `2px solid ${isActive ? color : '#d9d9d9'}`,
                    boxShadow: isActive ? `0 0 0 3px ${color}22` : 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 22,
                      height: 22,
                      margin: '0 auto',
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
