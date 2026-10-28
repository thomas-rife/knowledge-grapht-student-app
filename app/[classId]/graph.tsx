import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StyleSheet, View, Dimensions } from 'react-native'
import { Button, Text, Icon, IconButton } from 'react-native-paper'
import { type Href, useRouter, useGlobalSearchParams } from 'expo-router'
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  withDecay,
} from 'react-native-reanimated'
import { Node } from '@/assets/components/graph/Node'
import TopicNode from '@/assets/components/graph/TopicNode'
import TopicDetail from '@/assets/components/graph/TopicDetail'
import Path from '@/assets/components/graph/Path'
import { supabase } from '@/supabaseClient'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'
import GraphModal from '@/assets/components/graph/GraphModal'
import { getTopicConnections } from '@/assets/components/graph/graphRelationships'
import { BlurTargetView } from 'expo-blur'

interface Edge {
  id: string
  source: number
  target: number
}

interface ApiNode {
  id: number
  label: string
  position: { x: number; y: number }
  correctResponses?: number
  occurrences?: number
  isActive?: boolean
  lastReviewed?: string | null
  lastQuizAttempts?: number
  lastQuizCorrect?: number
  nextReview?: string | null
  availableQuestionCount?: number
}

interface ApiEdge {
  source: number
  target: number
}

const nodeSize = { maxWidth: 200, height: 50 }
const masteryLimit = 0.9
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const Graph = () => {
  const [trackingThreshold, setTrackingThreshold] = useState(10)

  // Shared values
  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  // For tracking gesture state
  const offsetX = useSharedValue(0)
  const offsetY = useSharedValue(0)

  const [selectedNode, setSelectedNode] = useState<Node>()
  const [modalVisible, setModalVisible] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const blurTarget = useRef<View | null>(null)

  const router = useRouter()
  const { classId: rawClassId, className: rawClassName } = useGlobalSearchParams<{
    classId?: string | string[]
    className?: string | string[]
  }>()

  const raw = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId
  const className = Array.isArray(rawClassName) ? rawClassName[0] : rawClassName
  const numeric = Number(raw)
  const classIdParam =
    raw && Number.isFinite(numeric) ? String(numeric) : encodeURIComponent(String(raw || ''))

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [halfLifeDays, setHalfLifeDays] = useState<number>(3)

  const topicConnections = useMemo(
    () => getTopicConnections(selectedNode?.id ?? NaN, nodes, edges),
    [selectedNode?.id, nodes, edges]
  )

  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.replace('/(auth)/login')
        return
      }

      const base = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/?$/, '/')
      const url = `${base}user/enrolled-class/${classIdParam}/knowledge-graph`

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) return

      const data = await response.json()

      if (data?.react_flow_data && Array.isArray(data.react_flow_data) && data.react_flow_data[0]) {
        const flowData = data.react_flow_data[0]

        if ('reactFlowNodes' in flowData && 'reactFlowEdges' in flowData) {
          const reactFlowNodes = flowData.reactFlowNodes
          const reactFlowEdges = flowData.reactFlowEdges

          if (typeof data?.trackingThreshold === 'number') {
            setTrackingThreshold(data.trackingThreshold)
          }

          if (typeof data?.halfLifeDays === 'number' && isFinite(data.halfLifeDays)) {
            setHalfLifeDays(data.halfLifeDays)
          }

          const fullEdges = reactFlowEdges.map(({ source, target }: any) => ({
            id: `${source}->${target}`,
            source: parseInt(source),
            target: parseInt(target),
          }))

          const fullNodes = reactFlowNodes.map((rfNode: any) => {
            const id = parseInt(rfNode.id)
            const apiNode = (data?.nodes || []).find((n: any) => n.id === id)

            const safeOccurrences = Math.max(0, Number(apiNode?.occurrences) || 0)
            const safeCorrect = Math.max(0, Number(apiNode?.correctResponses) || 0)
            const lastReviewed = apiNode?.lastReviewed
            const nextReview = apiNode?.nextReview ?? apiNode?.next_review ?? null
            const lastQuizAttempts = apiNode?.lastQuizAttempts
            const lastQuizCorrect = apiNode?.lastQuizCorrect

            const hasLastQuiz = typeof lastQuizAttempts === 'number' && lastQuizAttempts > 0
            let baseAccuracy = 0
            if (hasLastQuiz) {
              const lqa = Number(lastQuizAttempts) || 0
              const lqc = Number(lastQuizCorrect) || 0
              baseAccuracy = lqa > 0 ? Math.max(0, Math.min(1, lqc / lqa)) : 0
              if (lqa > 0 && lqc === lqa) baseAccuracy = 1
            } else if (safeOccurrences > 0) {
              baseAccuracy = Math.max(0, Math.min(1, safeCorrect / safeOccurrences))
            }

            const prior = 0.1
            const nrDate = nextReview ? new Date(nextReview) : null
            let decayed = baseAccuracy

            // Use nextReview-based decay if available
            if (nrDate && !isNaN(nrDate.getTime())) {
              const msPerDay = 24 * 60 * 60 * 1000
              const overdueDays = Math.max(0, (Date.now() - nrDate.getTime()) / msPerDay)
              if (overdueDays > 0) {
                const hl = halfLifeDays > 0 ? halfLifeDays : 3
                const factor = Math.pow(0.5, overdueDays / hl)
                decayed = prior + (baseAccuracy - prior) * factor
              }
            } else {
              // Fallback: if nextReview is missing, use lastReviewed-based decay
              const lrDate = lastReviewed ? new Date(lastReviewed) : null
              if (lrDate && !isNaN(lrDate.getTime())) {
                const msPerDay = 24 * 60 * 60 * 1000
                const days = Math.max(0, (Date.now() - lrDate.getTime()) / msPerDay)
                const hl = halfLifeDays > 0 ? halfLifeDays : 3
                const factor = Math.pow(0.5, days / hl)
                decayed = prior + (baseAccuracy - prior) * factor
              }
            }

            const accuracy = Math.round(decayed * 100) / 100

            return {
              id,
              isActive: apiNode?.isActive,
              label: rfNode.data?.label || apiNode?.label || `Topic ${id}`,
              position: {
                x: rfNode.position.x,
                y: rfNode.position.y,
              },
              correctResponses: safeCorrect,
              occurrences: safeOccurrences,
              availableQuestionCount: apiNode?.availableQuestionCount,
              accuracy,
              masterable: true,
              mastered: safeOccurrences > 0 && accuracy >= masteryLimit,
              lastReviewed: lastReviewed ?? null,
              nextReview: nextReview ?? null,
            } as Node
          })

          setNodes(fullNodes)
          setEdges(fullEdges)
          return
        }
      }

      const apiNodes = (data?.nodes || []) as ApiNode[]
      const apiEdges = (data?.edges || []) as ApiEdge[]

      const fullEdges = apiEdges.map(({ source, target }) => ({
        id: `${source}->${target}`,
        source,
        target,
      }))

      const fullNodes = apiNodes.map(
        ({
          id,
          isActive,
          label,
          position,
          correctResponses = 0,
          occurrences = 0,
          lastReviewed,
          nextReview,
          lastQuizAttempts,
          lastQuizCorrect,
          availableQuestionCount,
        }) => {
          const safeOccurrences = Math.max(0, Number(occurrences) || 0)
          const safeCorrect = Math.max(0, Number(correctResponses) || 0)

          const hasLastQuiz = typeof lastQuizAttempts === 'number' && lastQuizAttempts > 0
          let baseAccuracy = 0
          if (hasLastQuiz) {
            const lqa = Number(lastQuizAttempts) || 0
            const lqc = Number(lastQuizCorrect) || 0
            baseAccuracy = lqa > 0 ? Math.max(0, Math.min(1, lqc / lqa)) : 0
            if (lqa > 0 && lqc === lqa) baseAccuracy = 1
          } else if (safeOccurrences > 0) {
            baseAccuracy = Math.max(0, Math.min(1, safeCorrect / safeOccurrences))
          }

          const prior = 0.1
          const nrDate = nextReview ? new Date(nextReview) : null
          let decayed = baseAccuracy

          // Use nextReview-based decay if available
          if (nrDate && !isNaN(nrDate.getTime())) {
            const msPerDay = 24 * 60 * 60 * 1000
            const overdueDays = Math.max(0, (Date.now() - nrDate.getTime()) / msPerDay)
            if (overdueDays > 0) {
              const hl = halfLifeDays > 0 ? halfLifeDays : 5
              const factor = Math.pow(0.5, overdueDays / hl)
              decayed = prior + (baseAccuracy - prior) * factor
            }
          } else {
            // Fallback: if nextReview is missing, use lastReviewed-based decay
            const lrDate = lastReviewed ? new Date(lastReviewed) : null
            if (lrDate && !isNaN(lrDate.getTime())) {
              const msPerDay = 24 * 60 * 60 * 1000
              const days = Math.max(0, (Date.now() - lrDate.getTime()) / msPerDay)
              const hl = halfLifeDays > 0 ? halfLifeDays : 5
              const factor = Math.pow(0.5, days / hl)
              decayed = prior + (baseAccuracy - prior) * factor
            }
          }

          const accuracy = Math.round(decayed * 100) / 100

          return {
            id,
            isActive,
            label,
            position: { x: position.x * 1.25, y: position.y * 1.25 },
            correctResponses: safeCorrect,
            occurrences: safeOccurrences,
            availableQuestionCount,
            accuracy,
            masterable: true,
            mastered: safeOccurrences > 0 && accuracy >= masteryLimit,
            lastReviewed: lastReviewed ?? null,
            nextReview: nextReview ?? null,
          } as Node
        }
      )
      setNodes(fullNodes)
      setEdges(fullEdges)
    } catch (err) {
      console.error('Error fetching graph data:', err)
    } finally {
      setLoading(false)
    }
  }, [classIdParam, halfLifeDays, router])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  // PAN gesture
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      cancelAnimation(translateX)
      cancelAnimation(translateY)
      offsetX.value = translateX.value
      offsetY.value = translateY.value
    })
    .onUpdate(e => {
      translateX.value = offsetX.value + e.translationX
      translateY.value = offsetY.value + e.translationY
    })
    .onEnd(e => {
      const vx = e.velocityX * 0.3
      const vy = e.velocityY * 0.3

      translateX.value = withDecay({
        velocity: vx,
        clamp: [-3000, 3000],
      })

      translateY.value = withDecay({
        velocity: vy,
        clamp: [-3000, 3000],
      })
    })

  // PINCH gesture - keep the content under the fingers fixed while scaling.
  const startScale = useSharedValue(1)
  const startTranslateX = useSharedValue(0)
  const startTranslateY = useSharedValue(0)

  const pinchGesture = Gesture.Pinch()
    .onBegin(e => {
      cancelAnimation(scale)
      cancelAnimation(translateX)
      cancelAnimation(translateY)
      startScale.value = scale.value
      startTranslateX.value = translateX.value
      startTranslateY.value = translateY.value
    })
    .onUpdate(e => {
      // Optional dampening (50% slower)
      const rawScale = e.scale
      const dampedScale = (rawScale - 1) * 0.5 + 1
      const newScale = startScale.value * dampedScale
      const clampedScale = Math.max(0.5, Math.min(4, newScale))
      const scaleRatio = clampedScale / startScale.value

      scale.value = clampedScale
      translateX.value = e.focalX - (e.focalX - startTranslateX.value) * scaleRatio
      translateY.value = e.focalY - (e.focalY - startTranslateY.value) * scaleRatio
    })

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }
  })

  const handleNodePress = (node: Node) => {
    setSelectedNode(node)
    setModalVisible(true)
  }

  const startNodePractice = () => {
    if (!selectedNode || !raw || selectedNode.availableQuestionCount === 0) return
    setModalVisible(false)
    router.push({
      pathname: '/practice/questions',
      params: {
        classId: String(raw),
        className: className || '',
        review: '1',
        topic: selectedNode.label,
        reviewQuizSize: '10',
        quizMode: 'topic_practice',
        launchSource: 'graph_node',
      },
    } as unknown as Href)
  }

  const getEdgeEndpoints = (sourceNode: Node, targetNode: Node) => {
    const sourceCenter = {
      x: sourceNode.position.x + nodeSize.maxWidth / 2,
      y: sourceNode.position.y + nodeSize.height / 2,
    }
    const targetCenter = {
      x: targetNode.position.x + nodeSize.maxWidth / 2,
      y: targetNode.position.y + nodeSize.height / 2,
    }
    return {
      start: { x: sourceCenter.x, y: sourceNode.position.y + nodeSize.height },
      end: { x: targetCenter.x, y: targetNode.position.y },
    }
  }

  const centerView = useCallback(() => {
    if (nodes.length === 0) return

    const xs = nodes.map(n => n.position.x)
    const ys = nodes.map(n => n.position.y)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const screenCenterX = SCREEN_WIDTH / 2
    const screenCenterY = SCREEN_HEIGHT / 2

    const offsetX = screenCenterX - centerX
    const offsetY = screenCenterY - centerY

    cancelAnimation(translateX)
    cancelAnimation(translateY)
    cancelAnimation(scale)

    scale.value = withTiming(1)
    translateX.value = withTiming(offsetX)
    translateY.value = withTiming(offsetY)
  }, [nodes, scale, translateX, translateY])

  useEffect(() => {
    if (nodes.length > 0) {
      centerView()
    }
  }, [centerView, nodes.length])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BlurTargetView ref={blurTarget} style={styles.graphContainer}>
        <GestureDetector gesture={composedGestures}>
          <View style={styles.gestureArea}>
            <Animated.View style={[styles.contentWrapper, animatedStyle]}>
              <View style={styles.edgesContainer}>
                {edges.map(edge => {
                  const sourceNode = nodes.find(n => n.id === edge.source)
                  const targetNode = nodes.find(n => n.id === edge.target)
                  if (!sourceNode || !targetNode) return null
                  const { start, end } = getEdgeEndpoints(sourceNode, targetNode)
                  return <Path key={edge.id} start={start} end={end} />
                })}
              </View>

              <View style={styles.nodesContainer}>
                {nodes.map(node => (
                  <TopicNode
                    key={node.id}
                    node={node}
                    maxWidth={nodeSize.maxWidth}
                    threshold={trackingThreshold}
                    onPress={() => handleNodePress(node)}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={styles.infoButtonContainer}>
          <IconButton
            icon="information"
            size={28}
            mode="contained-tonal"
            accessibilityLabel="About topic progress"
            onPress={() => setShowInfo(true)}
          />
        </View>

        <View style={styles.resetButtonContainer}>
          <View style={styles.controlsColumn}>
            <IconButton
              icon={
                loading ? ({ color }) => <LoadingIndicator color={color} size="small" /> : 'reload'
              }
              mode="contained"
              disabled={loading}
              onPress={fetchGraphData}
              style={styles.resetButton}
            />
            <IconButton
              icon="crosshairs-gps"
              mode="contained"
              onPress={centerView}
              style={styles.resetButton}
            />
          </View>
        </View>

        <GraphModal
          visible={showInfo}
          blurTarget={blurTarget}
          title="How Mastery Works"
          onDismiss={() => setShowInfo(false)}
          footer={
            <Button mode="outlined" onPress={() => setShowInfo(false)}>
              Close
            </Button>
          }
        >
          <View style={styles.infoContent}>
            <View style={styles.infoLegendRow}>
              <Icon source="circle-outline" size={24} />
              <View style={styles.infoLegendCopy}>
                <Text variant="titleSmall">Not Started</Text>
                <Text variant="bodyMedium">You haven’t answered a question on this topic yet.</Text>
              </View>
            </View>
            <View style={styles.infoLegendRow}>
              <Icon source="progress-clock" size={24} color="#FF9800" />
              <View style={styles.infoLegendCopy}>
                <Text variant="titleSmall">In Progress</Text>
                <Text variant="bodyMedium">
                  You’ve practiced this topic and are building mastery.
                </Text>
              </View>
            </View>
            <View style={styles.infoLegendRow}>
              <Icon source="check-circle" size={24} color="#4CAF50" />
              <View style={styles.infoLegendCopy}>
                <Text variant="titleSmall">Mastered</Text>
                <Text variant="bodyMedium">Your displayed mastery is at least 90%.</Text>
              </View>
            </View>
            <Text variant="bodyMedium">
              Your mastery stays stable until your scheduled review date. Once a review becomes
              overdue, your mastery begins to decay gradually. Each node shows when it is due for
              review in the topic detail and in the top right. Complete lessons or practice quizzes
              with that topic to refresh your mastery and schedule the next review.
            </Text>
          </View>
        </GraphModal>

        {selectedNode && (
          <TopicDetail
            visible={modalVisible}
            threshold={trackingThreshold}
            masteryLimit={masteryLimit}
            selectedNode={selectedNode}
            blurTarget={blurTarget}
            {...topicConnections}
            onSelectTopic={handleNodePress}
            onDismiss={() => setModalVisible(false)}
            onStartPractice={startNodePractice}
          />
        )}
      </BlurTargetView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  graphContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  gestureArea: {
    flex: 1,
  },
  contentWrapper: {
    width: 3000,
    height: 3000,
    transformOrigin: '0px 0px',
  },
  edgesContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  nodesContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  resetButtonContainer: {
    position: 'absolute',
    bottom: 88,
    right: 20,
    zIndex: 3,
  },
  resetButton: {
    elevation: 4,
    marginBottom: 10,
  },
  controlsColumn: {
    alignItems: 'center',
  },
  infoButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 5,
  },
  infoContent: {
    padding: 20,
    gap: 20,
  },
  infoLegendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLegendCopy: {
    flex: 1,
    gap: 4,
  },
})

export default Graph
