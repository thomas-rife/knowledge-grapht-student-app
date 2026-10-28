import type { Node } from './Node'

interface TopicEdge {
  source: number
  target: number
}

/** Select only direct connections already supplied by the course graph. */
export function getTopicConnections(topicId: number, nodes: Node[], edges: TopicEdge[]) {
  const prerequisiteIds = new Set<number>()
  const downstreamIds = new Set<number>()

  for (const edge of edges) {
    if (edge.target === topicId && edge.source !== topicId) prerequisiteIds.add(edge.source)
    if (edge.source === topicId && edge.target !== topicId) downstreamIds.add(edge.target)
  }

  // Preserve the course graph's node order; don't rank or invent relationships.
  const prerequisites = nodes.filter(node => prerequisiteIds.has(node.id))
  const downstream = nodes.filter(node => downstreamIds.has(node.id))

  return {
    prerequisites: prerequisites.slice(0, 2),
    downstream: downstream.slice(0, 2),
    prerequisiteCount: prerequisites.length,
    downstreamCount: downstream.length,
  }
}
