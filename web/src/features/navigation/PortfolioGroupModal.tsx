import { useState } from 'react'
import { Input, Modal, message } from 'antd'
import { createPortfolioGroup, renamePortfolioGroup } from '../../services/portfolioApi'
import type { GroupParams } from '../../types/portfolio'

export type PortfolioGroupModalResult =
  | {
      mode: 'create'
      groupName: string
      params: GroupParams
    }
  | {
      mode: 'rename'
      previousGroupName: string
      groupName: string
      params: GroupParams
    }

type PortfolioGroupModalProps = {
  open: boolean
  mode: 'create' | 'rename'
  params: GroupParams
  groupName?: string
  onSubmitted?: (result: PortfolioGroupModalResult) => void
  onCancel: () => void
}

export const PortfolioGroupModal = ({
  open,
  mode,
  params,
  groupName,
  onSubmitted,
  onCancel,
}: PortfolioGroupModalProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [draftName, setDraftName] = useState(mode === 'rename' ? (groupName ?? '') : '')
  const [submitting, setSubmitting] = useState(false)

  const closeModal = () => {
    setDraftName('')
    onCancel()
  }

  const handleConfirm = async () => {
    const name = draftName.trim()
    if (!name) {
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'rename') {
        if (!groupName) {
          return
        }

        if (name === groupName) {
          closeModal()
          return
        }

        await renamePortfolioGroup(groupName, name, params)
        onSubmitted?.({
          mode: 'rename',
          previousGroupName: groupName,
          groupName: name,
          params,
        })
        closeModal()
        return
      }

      await createPortfolioGroup(name, params)
      onSubmitted?.({
        mode: 'create',
        groupName: name,
        params,
      })
      closeModal()
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
        title={mode === 'create' ? '新建分组' : '修改分组名称'}
        open={open}
        onOk={handleConfirm}
        onCancel={closeModal}
        okText="确定"
        cancelText="取消"
        confirmLoading={submitting}
      >
        <Input
          placeholder={mode === 'create' ? '请输入分组名称' : '请输入新的分组名称'}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onPressEnter={() => {
            void handleConfirm()
          }}
        />
      </Modal>
    </>
  )
}
