import type { CSSProperties } from 'react'

export const strategyPageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  height: '100%',
  overflow: 'auto',
}

export const strategyHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

export const panelGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
}

export const sectionStyle: CSSProperties = {
  minHeight: 132,
  padding: 14,
  border: '1px solid #f0f0f0',
  borderRadius: 8,
  background: '#fafafa',
}

export const strategyListStyle: CSSProperties = {
  padding: 14,
  border: '1px solid #f0f0f0',
  borderRadius: 8,
  background: '#fff',
}

export const strategyListHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
}

export const checkboxGroupStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
}

export const tabContentStyle: CSSProperties = {
  width: '100%',
}

export const sliderFieldStyle: CSSProperties = {
  flex: 1,
  paddingRight: 12,
}
