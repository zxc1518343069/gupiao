import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Empty, Tag, Typography } from 'antd'
import type { CSSProperties } from 'react'
import type { DiagramNode, DiagramNodeTone } from '../types'

const { Text } = Typography

type IndustryDiagramMindMapProps = {
  tree: DiagramNode | null
}

type MindMapNodeData = {
  label: string
  caption?: string
  badge?: string
  color?: string
  tone?: DiagramNodeTone
  childCount: number
  collapsed?: boolean
  collapsible?: boolean
}

type MindMapLayoutResult = {
  edges: Edge[]
  nodes: Node<MindMapNodeData>[]
}

const horizontalGap = 300
const siblingGap = 56
const defaultNodeHeight = 62
const stockNodeHeight = 92

const toneStyleMap: Record<DiagramNodeTone, CSSProperties> = {
  root: {
    background: '#ffbf00',
    borderColor: '#ffbf00',
    color: '#ffffff',
  },
  group: {
    background: '#ff5f45',
    borderColor: '#ff5f45',
    color: '#ffffff',
  },
  view: {
    background: '#5d7cef',
    borderColor: '#5d7cef',
    color: '#ffffff',
  },
  tag: {
    background: '#69d08f',
    borderColor: '#69d08f',
    color: '#ffffff',
  },
  stock: {
    background: '#ffffff',
    borderColor: '#d9e3f0',
    color: '#253044',
  },
  empty: {
    background: '#f7f8fa',
    borderColor: '#c6cbd4',
    color: '#596273',
  },
}

const getDepthSiblingGap = (depth: number) => {
  if (depth <= 1) {
    return 86
  }
  if (depth === 2) {
    return 68
  }

  return siblingGap
}

const getNodeHeight = (node: DiagramNode) =>
  node.tone === 'stock' ? stockNodeHeight : defaultNodeHeight

const getVisibleChildren = (node: DiagramNode, collapsedNodeIds: Set<string>) => {
  if (collapsedNodeIds.has(node.id)) {
    return []
  }

  return node.children ?? []
}

const getChildrenHeight = (node: DiagramNode, depth: number, collapsedNodeIds: Set<string>) => {
  const children = getVisibleChildren(node, collapsedNodeIds)
  if (children.length === 0) {
    return 0
  }

  return children.reduce(
    (currentHeight, childNode, index) =>
      currentHeight +
      getSubtreeHeight(childNode, depth + 1, collapsedNodeIds) +
      (index > 0 ? getDepthSiblingGap(depth + 1) : 0),
    0,
  )
}

const getSubtreeHeight = (
  node: DiagramNode,
  depth: number,
  collapsedNodeIds: Set<string>,
): number => {
  if (getVisibleChildren(node, collapsedNodeIds).length === 0) {
    return getNodeHeight(node)
  }

  return Math.max(getNodeHeight(node), getChildrenHeight(node, depth, collapsedNodeIds))
}

const toMindMapLayout = (tree: DiagramNode, collapsedNodeIds: Set<string>): MindMapLayoutResult => {
  const nodes: Node<MindMapNodeData>[] = []
  const edges: Edge[] = []

  const placeNode = (node: DiagramNode, depth: number, top: number, parentId?: string): number => {
    const nodeHeight = getNodeHeight(node)
    const subtreeHeight = getSubtreeHeight(node, depth, collapsedNodeIds)
    const centerY = top + subtreeHeight / 2 - nodeHeight / 2
    const isCollapsed = collapsedNodeIds.has(node.id)
    const childCount = node.children?.length ?? 0

    nodes.push({
      id: node.id,
      type: 'mindMap',
      data: {
        label: node.label,
        caption: node.caption,
        badge: node.badge,
        color: node.color,
        tone: node.tone,
        childCount,
        collapsed: isCollapsed,
        collapsible: childCount > 0,
      },
      position: {
        x: depth * horizontalGap,
        y: centerY,
      },
      draggable: false,
    })

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        sourceHandle: 'right',
        targetHandle: 'left',
        style: {
          stroke: node.color ?? toneStyleMap[node.tone ?? 'tag'].borderColor,
          strokeWidth: 3,
        },
      })
    }

    const visibleChildren = getVisibleChildren(node, collapsedNodeIds)
    if (visibleChildren.length === 0) {
      return top + nodeHeight
    }

    const childrenHeight = getChildrenHeight(node, depth, collapsedNodeIds)
    let childTop = top + Math.max((subtreeHeight - childrenHeight) / 2, 0)
    visibleChildren.forEach((childNode) => {
      childTop = placeNode(childNode, depth + 1, childTop, node.id) + getDepthSiblingGap(depth + 1)
    })

    return top + subtreeHeight
  }

  placeNode(tree, 0, 0)

  return {
    edges,
    nodes,
  }
}

const MindMapNode = ({ data }: NodeProps<Node<MindMapNodeData>>) => {
  const toneStyle = toneStyleMap[data.tone ?? 'tag']
  const isStockNode = data.tone === 'stock'
  const isMutedCaption = data.caption === '暂无建议'
  const collapseLabel = data.collapsed ? '展开' : '收起'

  return (
    <div
      style={{
        width: isStockNode ? 226 : 132,
        minHeight: isStockNode ? stockNodeHeight - 20 : defaultNodeHeight - 18,
        padding: isStockNode ? '8px 10px' : '10px 12px',
        border: `1px solid ${data.color ?? toneStyle.borderColor}`,
        borderRadius: 9,
        background: toneStyle.background,
        color: toneStyle.color,
        cursor: data.collapsible ? 'pointer' : 'default',
        boxShadow: '0 8px 20px rgba(16, 24, 40, 0.08)',
      }}
      title={data.collapsible ? `点击${collapseLabel}${data.childCount}个子节点` : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ width: 0, height: 0, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ width: 0, height: 0, opacity: 0 }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <Text
          strong
          style={{
            flex: 1,
            minWidth: 0,
            color: 'inherit',
            lineHeight: 1.35,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {data.label}
        </Text>
        {data.badge ? (
          <Tag
            color={isStockNode ? undefined : data.color}
            style={{
              flexShrink: 0,
              marginInlineEnd: 0,
              color: isStockNode ? '#596273' : undefined,
            }}
          >
            {data.badge}
          </Tag>
        ) : null}
      </div>
      {data.collapsible ? (
        <Text
          style={{
            display: 'block',
            marginTop: 5,
            color: '#ffffff',
            fontSize: 12,
            lineHeight: 1.35,
            opacity: 0.86,
          }}
        >
          {data.collapsed ? '点击展开子节点' : '点击收起子节点'}
        </Text>
      ) : null}
      {data.caption ? (
        <Text
          style={{
            display: 'block',
            marginTop: 5,
            color: isMutedCaption ? '#8a94a6' : '#3a465a',
            fontSize: 12,
            lineHeight: 1.35,
            wordBreak: 'break-word',
          }}
        >
          {data.caption}
        </Text>
      ) : null}
    </div>
  )
}

const nodeTypes = {
  mindMap: MindMapNode,
}

const createTreeRenderKey = (tree: DiagramNode | null) => {
  if (!tree) {
    return 'empty'
  }

  const collectNodeKeys = (node: DiagramNode): string[] => [
    `${node.id}:${node.badge ?? ''}`,
    ...(node.children ?? []).flatMap(collectNodeKeys),
  ]

  return collectNodeKeys(tree).join('|')
}

const IndustryDiagramMindMapContent = ({ tree }: IndustryDiagramMindMapProps) => {
  const { fitView } = useReactFlow<Node<MindMapNodeData>, Edge>()
  const nodesInitialized = useNodesInitialized()
  const defaultCollapsedNodeIds = useMemo(() => {
    const nextCollapsedNodeIds = new Set<string>()

    const collectCollapsibleNodes = (node: DiagramNode) => {
      if ((node.tone === 'tag' || node.tone === 'empty') && node.children?.length) {
        nextCollapsedNodeIds.add(node.id)
      }

      node.children?.forEach(collectCollapsibleNodes)
    }

    if (tree) {
      collectCollapsibleNodes(tree)
    }

    return nextCollapsedNodeIds
  }, [tree])
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(defaultCollapsedNodeIds)
  const [hasAppliedInitialViewport, setHasAppliedInitialViewport] = useState(false)
  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedNodeIds((currentNodeIds) => {
      const nextNodeIds = new Set(currentNodeIds)

      if (nextNodeIds.has(nodeId)) {
        nextNodeIds.delete(nodeId)
      } else {
        nextNodeIds.add(nodeId)
      }

      return nextNodeIds
    })
  }, [])
  const { edges, nodes } = useMemo(
    () => (tree ? toMindMapLayout(tree, collapsedNodeIds) : { edges: [], nodes: [] }),
    [collapsedNodeIds, tree],
  )
  const handleNodeClick = useCallback(
    (event: MouseEvent, node: Node<MindMapNodeData>) => {
      if (!node.data.collapsible) {
        return
      }

      event.stopPropagation()
      toggleNode(node.id)
    },
    [toggleNode],
  )
  const fitViewOptions = useMemo(() => ({ padding: 0.32, duration: 300, maxZoom: 0.68 }), [])
  const getMiniMapNodeColor = useCallback((node: Node<MindMapNodeData>) => {
    const toneStyle = toneStyleMap[node.data.tone ?? 'tag']
    return node.data.color ?? String(toneStyle.background)
  }, [])

  useEffect(() => {
    if (!nodesInitialized || hasAppliedInitialViewport || nodes.length === 0) {
      return
    }

    window.requestAnimationFrame(() => {
      void fitView(fitViewOptions)
      setHasAppliedInitialViewport(true)
    })
  }, [fitView, fitViewOptions, hasAppliedInitialViewport, nodes.length, nodesInitialized])

  if (!tree) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可图示化的数据" />
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
      <ReactFlow
        colorMode="light"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.18}
        maxZoom={2.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        style={{ background: '#fbfcfe' }}
      >
        <Background color="#e8edf5" gap={24} />
        <MiniMap
          pannable
          zoomable
          nodeColor={getMiniMapNodeColor}
          style={{
            width: 140,
            height: 96,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
          }}
        />
        <Controls position="top-right" showInteractive={false} fitViewOptions={fitViewOptions} />
      </ReactFlow>
    </div>
  )
}

export const IndustryDiagramMindMap = (props: IndustryDiagramMindMapProps) => (
  <ReactFlowProvider>
    <IndustryDiagramMindMapContent key={createTreeRenderKey(props.tree)} {...props} />
  </ReactFlowProvider>
)
