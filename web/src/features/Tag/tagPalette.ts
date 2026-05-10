import type { PortfolioTagDefinition } from '@/types/portfolio'

export const portfolioTagPalette = [
  '#13c2c2',
  '#1677ff',
  '#722ed1',
  '#fa8c16',
  '#eb2f96',
  '#52c41a',
  '#2f54eb',
  '#fa541c',
] as const

const fallbackTagPalette = [
  '#1677ff',
  '#13c2c2',
  '#722ed1',
  '#fa8c16',
  '#eb2f96',
  '#52c41a',
  '#2f54eb',
  '#a0d911',
] as const

export const resolvePortfolioTagColor = (
  tagName: string,
  tagDefinitions: PortfolioTagDefinition[],
) => {
  const matchedDefinition = tagDefinitions.find((definition) => definition.name === tagName)
  if (matchedDefinition) {
    return matchedDefinition.color
  }

  const hash = Array.from(tagName).reduce(
    (currentValue, currentChar) => currentValue + currentChar.charCodeAt(0),
    0,
  )

  return fallbackTagPalette[Math.abs(hash) % fallbackTagPalette.length]
}
