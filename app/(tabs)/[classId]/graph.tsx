import React, { useState, useRef, useEffect, useCallback } from 'react'
import { StyleSheet, PanResponder, Animated, View } from 'react-native'
import { IconButton } from 'react-native-paper'
import { useLocalSearchParams } from 'expo-router'

import { Node } from '@/assets/components/graph/Node'

import TopicNode from '@/assets/components/graph/TopicNode'
import TopicDetail from '@/assets/components/graph/TopicDetail'
import Path from '@/assets/components/graph/Path'

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
}

interface ApiEdge {
  source: number
  target: number
}

const nodeSize = { maxWidth: 200, height: 50 }

/*
 * Minimum accuracy to consider a topic mastered.
 * Currently hard-coded, but may eventually be retrieved from API.
 */
const masteryLimit = 1.0

/*
 * Minimum number of questions required to determine progress in a topic.
 * Currently hard-coded, but may eventually be retrieved from API.
 */

const Graph = () => {
  const [trackingThreshold, setTrackingThreshold] = useState(10)
  const [scale, setScale] = useState(1)
  const [selectedNode, setSelectedNode] = useState<Node>()
  const [modalVisible, setModalVisible] = useState(false)

  const pan = useRef(new Animated.ValueXY()).current
  const lastScale = useRef(1)
  const lastDistance = useRef(0)
  const panOffset = useRef({ x: 0, y: 0 })

  const { classId: rawClassId } = useLocalSearchParams()

  // Normalize class id param: numeric id if valid, otherwise keep the slug/name
  const raw = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId
  const numeric = Number(raw)
  const classIdParam = Number.isFinite(numeric) ? String(numeric) : encodeURIComponent(String(raw))

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)

  const [halfLifeDays, setHalfLifeDays] = useState<number>(5)

  // Fetch and normalize graph data
  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    try {
      const base = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/?$/, '/')
      const response = await fetch(`${base}user/enrolled-class/${classIdParam}/knowledge-graph`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        console.warn('Graph fetch failed with status', response.status)
        return
      }

      const data = await response.json()
      const apiNodes = (data?.nodes || []) as ApiNode[]
      const apiEdges = (data?.edges || []) as ApiEdge[]

      // tracking threshold from API if present
      if (typeof data?.trackingThreshold === 'number') {
        setTrackingThreshold(data.trackingThreshold)
      }

      // half-life from API if present
      if (typeof data?.halfLifeDays === 'number' && isFinite(data.halfLifeDays)) {
        setHalfLifeDays(data.halfLifeDays)
      }

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
          // new optional fields from API
          lastReviewed,
          lastQuizAttempts,
          lastQuizCorrect,
        }) => {
          const safeOccurrences = Math.max(0, Number(occurrences) || 0)
          const safeCorrect = Math.max(0, Number(correctResponses) || 0)

          // base accuracy favors last quiz snapshot if present
          const hasLastQuiz = typeof lastQuizAttempts === 'number' && lastQuizAttempts > 0
          let baseAccuracy = 0
          if (hasLastQuiz) {
            const lqa = Number(lastQuizAttempts) || 0
            const lqc = Number(lastQuizCorrect) || 0
            baseAccuracy = lqa > 0 ? Math.max(0, Math.min(1, lqc / lqa)) : 0
            // full bar if last quiz was perfect
            if (lqa > 0 && lqc === lqa) baseAccuracy = 1
          } else if (safeOccurrences > 0) {
            baseAccuracy = Math.max(0, Math.min(1, safeCorrect / safeOccurrences))
          }

          // decay with half life based on lastReviewed
          const lrDate = lastReviewed ? new Date(lastReviewed) : null
          let decayed = baseAccuracy
          if (lrDate && !isNaN(lrDate.getTime())) {
            const msPerDay = 24 * 60 * 60 * 1000
            const days = Math.max(0, (Date.now() - lrDate.getTime()) / msPerDay)
            const hl = halfLifeDays > 0 ? halfLifeDays : 5
            const factor = Math.pow(0.5, days / hl)
            decayed = baseAccuracy * factor
          }

          const accuracy = Math.round(decayed * 100) / 100
          const masterable = safeOccurrences >= trackingThreshold
          // Synthesize counts for the TopicNode bar from accuracy so the bar fill matches decay
          const denom = Math.max(1, trackingThreshold) // how many “ticks” the bar shows
          const displayCorrect = Math.round(accuracy * denom)
          const displayOcc = denom

          return {
            id,
            isActive,
            label,
            position: { x: position.x * 1.25, y: position.y * 1.25 },
            // Use synthesized counts for the visual bar
            correctResponses: displayCorrect,
            occurrences: displayOcc,
            // Keep computed fields for details modal
            accuracy,
            masterable: true, // visually masterable since we now always provide denom ticks
            mastered: accuracy >= masteryLimit,
          } as Node
        }
      )

      setNodes(fullNodes)
      setEdges(fullEdges)
    } finally {
      setLoading(false)
    }
  }, [classIdParam, trackingThreshold, halfLifeDays])

  // 2) A small useEffect that calls it
  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  /*
   * @TODO Is this really right? should check...
   */
  useEffect(() => {
    const panListener = pan.addListener(value => {
      panOffset.current = value
    })
    return () => pan.removeListener(panListener)
  }, [])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't capture tap events initially
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture events when there's significant movement or multiple touches (zooming)
        const { dx, dy } = gestureState
        const isMoveSignificant = Math.abs(dx) > 5 || Math.abs(dy) > 5
        const isMultiTouch = evt.nativeEvent.touches.length > 1
        return isMoveSignificant || isMultiTouch
      },

      // When dragging,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: panOffset.current.x,
          y: panOffset.current.y,
        })
      },

      /**
       * Handles pinch-to-zoom functionality.
       */
      onPanResponderMove: (e, gestureState) => {
        if (e.nativeEvent.changedTouches.length === 2) {
          const touch1 = e.nativeEvent.changedTouches[0]
          const touch2 = e.nativeEvent.changedTouches[1]

          /** Scale is currently directly set to the distance between the pinched fingers
           *
           * @TODO Try to fix zooming so that scale is not directly tied to finger distance,
           *    but instead to an independent value that changes when the finger distance changes
           */
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          )

          if (lastDistance.current === 0) {
            lastDistance.current = distance
            return
          }

          /**
           * @TODO Check this formula????
           */
          const newScale = lastScale.current * (distance / lastDistance.current)
          // Limit zoom range
          if (newScale >= 0.5 && newScale <= 2) {
            setScale(newScale)
          }
          return
        }

        // Handle pan
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        })
      },

      onPanResponderRelease: () => {
        pan.flattenOffset()
        lastScale.current = scale
        lastDistance.current = 0
      },
    })
  ).current

  const handleNodePress = (node: Node) => {
    /**
     * @TODO Pan view into node when tapped
     * doesnt work -> pan.setValue({ x: node.position.x, y: node.position.y })
     */
    setSelectedNode(node)
    setModalVisible(true)
  }

  const resetView = () => {
    pan.setValue({ x: 0, y: 0 })
    setScale(1)
  }

  return (
    <View style={styles.graphContainer} {...panResponder.panHandlers}>
      {/* panResponder goes into wrapper view because we don't want the panResponder to move+scale */}
      <View>
        <Animated.View
          style={[
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scale }],
            },
          ]}
        >
          {/* Render edges */}
          <View style={styles.edgesContainer}>
            {edges.map(edge => {
              /*
               * At time of writing, node IDs simply increment from 1.
               * Since they arrive in an array in order of increasing ID, their position in the
               * list can be retrieved by subtracting 1 from their ID.
               */
              const sourceNode = nodes[edge.source - 1]
              const targetNode = nodes[edge.target - 1]

              if (!sourceNode || !targetNode) return null

              /*
               * @TODO Rework start and end positions to be the nearest cardinal direction of each node
               */

              const start = {
                x: sourceNode.position.x + nodeSize.maxWidth / 2,
                y: sourceNode.position.y + nodeSize.height / 2,
              }
              const end = {
                x: targetNode.position.x + nodeSize.maxWidth / 2,
                y: targetNode.position.y + nodeSize.height / 2,
              }

              return <Path key={edge.id} start={start} end={end} />
            })}
          </View>

          {/* Render nodes */}
          {nodes.map(node => {
            return (
              <TopicNode
                key={node.id}
                node={node}
                maxWidth={nodeSize.maxWidth}
                threshold={trackingThreshold}
                onPress={() => handleNodePress(node)}
              />
            )
          })}
        </Animated.View>
      </View>

      {/* Button resets pan + scale */}
      <View style={styles.resetButtonContainer}>
        <View style={styles.controlsColumn}>
          <IconButton
            icon={loading ? 'progress-clock' : 'reload'}
            mode="contained"
            disabled={loading}
            onPress={fetchGraphData}
            style={styles.resetButton}
          />
        </View>
      </View>

      {selectedNode && (
        <TopicDetail
          visible={modalVisible}
          threshold={trackingThreshold}
          masteryLimit={masteryLimit}
          selectedNode={selectedNode}
          topicFilter={selectedNode?.label} // add this
          onDismiss={() => setModalVisible(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  graphContainer: {
    flex: 1,
  },
  edgesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  edge: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left',
  },
  resetButtonContainer: {
    position: 'absolute',
    bottom: '3%',
    right: '5%',
    zIndex: 3,
  },
  resetButton: {
    elevation: 4,
  },
  controlsColumn: {
    alignItems: 'center',
  },
})

export default Graph
