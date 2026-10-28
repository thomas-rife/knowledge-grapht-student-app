import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Icon, Text, useTheme } from 'react-native-paper'
import Svg, { Path } from 'react-native-svg'
import { Node } from './Node'

interface TopicConnectionsProps {
  selectedNode: Node
  prerequisites: Node[]
  downstream: Node[]
  prerequisiteCount: number
  downstreamCount: number
  onSelectTopic?: (node: Node) => void
}

interface ConnectionLinesProps {
  count: number
  direction: 'incoming' | 'outgoing'
  color: string
}

/** Column centers remain at 25/75% (or 50%) as cards wrap to different heights. */
function ConnectionLines({ count, direction, color }: ConnectionLinesProps) {
  const anchors = count === 1 ? [50] : [25, 75]

  return (
    <Svg
      width="100%"
      height={32}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      pointerEvents="none"
      accessible={false}
    >
      {anchors.map((anchor) => (
        <Path
          key={anchor}
          d={
            direction === 'incoming'
              ? `M ${anchor} 0 C ${anchor} 16, 50 12, 50 30`
              : `M 50 0 C 50 18, ${anchor} 12, ${anchor} 30`
          }
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  )
}

export default function TopicConnections({
  selectedNode,
  prerequisites,
  downstream,
  prerequisiteCount,
  downstreamCount,
  onSelectTopic,
}: TopicConnectionsProps) {
  const theme = useTheme()
  const hasPracticeQuestions = selectedNode.availableQuestionCount !== 0
  const hasAttempts = selectedNode.occurrences > 0
  const accuracy = Math.round(selectedNode.accuracy * 100)

  const renderMoreHint = (total: number, shown: number, placement: 'above' | 'below') => {
    const remaining = total - shown
    if (remaining <= 0) return null

    return (
      <Text
        style={[
          styles.moreHint,
          placement === 'above' ? styles.hintAbove : styles.hintBelow,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        +{remaining} more in the full graph
      </Text>
    )
  }

  const renderTopicRow = (topics: Node[], relationship: 'prerequisite' | 'downstream') => (
    <View style={styles.topicRow}>
      {topics.map((topic) => {
        const topicStatus = topic.availableQuestionCount === 0
          ? null
          : topic.occurrences > 0
            ? `${Math.round(topic.accuracy * 100)}% accuracy`
            : 'Not Started'
        const accessibilityLabel = `${topic.label}, ${
          relationship === 'prerequisite'
            ? `feeds into ${selectedNode.label}`
            : `supported by ${selectedNode.label}`
        }${topicStatus ? `, ${topicStatus}` : ''}`
        const cardContent = (
          <>
            <Text style={[styles.topicTitle, { color: theme.colors.onSurface }]}>
              {topic.label}
            </Text>
            {(topicStatus || onSelectTopic) && (
              <View style={styles.topicStatusRow}>
                {topicStatus && (
                  <Text style={[styles.topicStatus, { color: theme.colors.onSurfaceVariant }]}>
                    {topicStatus}
                  </Text>
                )}
                {onSelectTopic && (
                  <Icon source="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
                )}
              </View>
            )}
          </>
        )

        return (
          <View key={topic.id} style={styles.topicColumn}>
            {onSelectTopic ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${accessibilityLabel}`}
                onPress={() => onSelectTopic(topic)}
                style={({ pressed }) => [
                  styles.topicCard,
                  {
                    backgroundColor: pressed
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {cardContent}
              </Pressable>
            ) : (
              <View
                accessible
                accessibilityLabel={accessibilityLabel}
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {cardContent}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )

  return (
    <View style={styles.container}>
      {renderMoreHint(prerequisiteCount, prerequisites.length, 'above')}
      {prerequisites.length > 0 ? (
        <>
          {renderTopicRow(prerequisites, 'prerequisite')}
          <ConnectionLines
            count={prerequisites.length}
            direction="incoming"
            color={theme.colors.outline}
          />
        </>
      ) : (
        <Text style={[styles.emptyRelationship, { color: theme.colors.onSurfaceVariant }]}>
          No direct prerequisite topics.
        </Text>
      )}

      <View
        accessible
        accessibilityLabel={`${selectedNode.label}, selected topic${
          hasPracticeQuestions
            ? `, ${hasAttempts ? `${accuracy}% accuracy` : 'Not Started'}`
            : ', no questions available'
        }`}
        style={[
          styles.focusCard,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <Text style={[styles.selectedLabel, { color: theme.colors.onPrimaryContainer }]}>
          Selected topic
        </Text>
        <Text style={[styles.focusTitle, { color: theme.colors.onPrimaryContainer }]}>
          {selectedNode.label}
        </Text>
        {hasPracticeQuestions ? (hasAttempts ? (
          <View style={styles.accuracyRow}>
            <Text style={[styles.accuracyValue, { color: theme.colors.onPrimaryContainer }]}>
              {accuracy}%
            </Text>
            <Text style={[styles.accuracyLabel, { color: theme.colors.onPrimaryContainer }]}>
              Accuracy
            </Text>
          </View>
        ) : (
          <Text style={[styles.unstartedLabel, { color: theme.colors.onPrimaryContainer }]}>
            Not Started
          </Text>
        )) : (
          <Text style={[styles.questionAvailability, { color: theme.colors.onPrimaryContainer }]}>
            No questions available
          </Text>
        )}
      </View>

      {downstream.length > 0 ? (
        <>
          <ConnectionLines
            count={downstream.length}
            direction="outgoing"
            color={theme.colors.outline}
          />
          {renderTopicRow(downstream, 'downstream')}
        </>
      ) : (
        <Text style={[styles.emptyRelationship, { color: theme.colors.onSurfaceVariant }]}>
          No follow up topics.
        </Text>
      )}
      {renderMoreHint(downstreamCount, downstream.length, 'below')}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hintAbove: {
    marginBottom: 10,
  },
  hintBelow: {
    marginTop: 10,
  },
  moreHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  topicColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  topicCard: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 80,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 5,
  },
  topicStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  topicTitle: {
    width: '100%',
    minWidth: 0,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  topicStatus: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyRelationship: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginVertical: 12,
  },
  focusCard: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 7,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  focusTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 7,
  },
  accuracyValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  accuracyLabel: {
    fontSize: 13,
  },
  unstartedLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  questionAvailability: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
})
