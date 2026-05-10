import { Tag, Typography } from 'antd'

const { Text } = Typography

type PortfolioMembershipTagsProps = {
  names?: string[] | null
  fallbackName?: string | null
  colorMode?: 'single' | 'stable'
  color?: string
  emptyText?: string | null
}

const normalizeMembershipNames = (names?: string[] | null, fallbackName?: string | null) => {
  const rawNames = names?.length ? names : fallbackName ? [fallbackName] : []
  const seenNames = new Set<string>()

  return rawNames.reduce<string[]>((result, name) => {
    const trimmedName = name.trim()
    if (!trimmedName || seenNames.has(trimmedName)) {
      return result
    }

    seenNames.add(trimmedName)
    result.push(trimmedName)
    return result
  }, [])
}

const resolveStableTagColor = (name: string) => {
  const hash = Array.from(name).reduce(
    (currentValue, currentChar, index) =>
      currentValue * 33 + currentChar.charCodeAt(0) * (index + 1),
    7,
  )
  const positiveHash = Math.abs(hash)
  const hue = positiveHash % 360
  const saturation = 62 + (positiveHash % 10)
  const lightness = 40 + (positiveHash % 8)

  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

export const PortfolioMembershipTags = ({
  names,
  fallbackName,
  colorMode = 'single',
  color = 'blue',
  emptyText = null,
}: PortfolioMembershipTagsProps) => {
  const membershipNames = normalizeMembershipNames(names, fallbackName)

  if (!membershipNames.length) {
    return emptyText ? (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {emptyText}
      </Text>
    ) : null
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {membershipNames.map((name) => (
        <Tag
          key={name}
          color={colorMode === 'stable' ? resolveStableTagColor(name) : color}
          style={{ marginInlineEnd: 0, marginBottom: 0 }}
        >
          {name}
        </Tag>
      ))}
    </div>
  )
}
