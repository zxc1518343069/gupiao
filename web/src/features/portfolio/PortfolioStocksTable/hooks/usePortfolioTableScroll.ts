import { useCallback, useEffect, useRef, useState } from 'react'

type UsePortfolioTableScrollOptions = {
  columnCount: number
  rowCount: number
  enabled?: boolean
}

export const usePortfolioTableScroll = ({
  columnCount,
  rowCount,
  enabled = true,
}: UsePortfolioTableScrollOptions) => {
  const [tableScrollY, setTableScrollY] = useState(320)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)

  const updateTableScrollY = useCallback(() => {
    const container = tableContainerRef.current
    if (!container) {
      return
    }

    const headerElement = container.querySelector(
      '.ant-table-header, .ant-table-thead',
    ) as HTMLElement | null
    const bodyElement = container.querySelector('.ant-table-body') as HTMLElement | null
    const headerHeight = Math.ceil(headerElement?.getBoundingClientRect().height ?? 40)
    const scrollbarHeight = bodyElement
      ? Math.max(bodyElement.offsetHeight - bodyElement.clientHeight, 0)
      : 16
    const nextScrollY = Math.max(container.clientHeight - headerHeight - scrollbarHeight - 6, 180)

    setTableScrollY((currentHeight) =>
      Math.abs(currentHeight - nextScrollY) > 1 ? nextScrollY : currentHeight,
    )
  }, [])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const container = tableContainerRef.current
    if (!container) {
      return undefined
    }

    const runUpdate = () => {
      window.requestAnimationFrame(() => {
        updateTableScrollY()
      })
    }

    runUpdate()

    const resizeObserver = new ResizeObserver(() => {
      runUpdate()
    })

    resizeObserver.observe(container)

    const tableElement = container.querySelector('.ant-table') as HTMLElement | null
    if (tableElement) {
      resizeObserver.observe(tableElement)
    }

    window.addEventListener('resize', runUpdate)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', runUpdate)
    }
  }, [columnCount, enabled, rowCount, updateTableScrollY])

  return {
    tableContainerRef,
    tableScrollY,
  }
}
