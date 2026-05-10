export type DiagramNodeTone = 'root' | 'group' | 'view' | 'tag' | 'stock' | 'empty'

export type DiagramNode = {
  id: string
  label: string
  caption?: string
  badge?: string
  color?: string
  tone?: DiagramNodeTone
  children?: DiagramNode[]
}
