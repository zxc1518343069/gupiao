import { Typography } from 'antd'

const { Text } = Typography

type MetricHtmlProps = {
  html: string | null
  errorText?: string | null
}

type MetricPlaceholderProps = {
  errorText?: string | null
}

export const MetricPlaceholder = ({ errorText }: MetricPlaceholderProps) => (
  <Text type="secondary" title={errorText || undefined}>
    -
  </Text>
)

export const MetricHtml = ({ html, errorText }: MetricHtmlProps) => {
  if (!html) {
    return <MetricPlaceholder errorText={errorText} />
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: '13px', lineHeight: '1.6' }}
    />
  )
}
