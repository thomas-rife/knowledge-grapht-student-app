import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, Button, ProgressBar, Icon, useTheme } from 'react-native-paper'
import { Node } from './Node'
import GraphModal from './GraphModal'
import TopicConnections from './TopicConnections'

interface TopicDetailProps {
  visible: boolean
  threshold: number
  masteryLimit: number
  selectedNode: Node
  prerequisites: Node[]
  downstream: Node[]
  prerequisiteCount: number
  downstreamCount: number
  onSelectTopic: (node: Node) => void
  onDismiss: () => void
  onStartPractice: () => void
  blurTarget?: React.RefObject<View | null>
}

const progressBarColor = (progress: number) => {
  if (progress >= 1) {
    return '#0CBFE9' // blue
  } else if (progress >= 0.75) {
    return '#86DC3D' // green
  } else if (progress >= 0.5) {
    return '#FFDE21' // yellow
  } else if (progress >= 0.25) {
    return '#E27602' // orange
  } else {
    return '#FF0000' // red
  }
}

const formatReviewDate = (nextReview: string | null): string => {
  if (!nextReview) return 'Not scheduled'

  const reviewDate = new Date(nextReview)
  if (isNaN(reviewDate.getTime())) return 'Invalid date'

  const now = new Date()
  const diffMs = reviewDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  // Format the date
  const dateStr = reviewDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: reviewDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })

  // Add relative time
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return `${dateStr} (${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue)`
  } else if (diffDays === 0) {
    return `${dateStr} (Today)`
  } else if (diffDays === 1) {
    return `${dateStr} (Tomorrow)`
  } else if (diffDays < 7) {
    return `${dateStr} (in ${diffDays} days)`
  } else {
    const weeks = Math.floor(diffDays / 7)
    return `${dateStr} (in ${weeks} week${weeks !== 1 ? 's' : ''})`
  }
}

const getReviewStatusColor = (nextReview: string | null): string => {
  if (!nextReview) return '#9E9E9E'

  const reviewDate = new Date(nextReview)
  if (isNaN(reviewDate.getTime())) return '#9E9E9E'

  const now = Date.now()
  const diffMs = reviewDate.getTime() - now
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays < 0) return '#F44336' // Red - overdue
  if (diffDays === 0) return '#FF9800' // Orange - due today
  if (diffDays === 1) return '#FFC107' // Amber - due tomorrow
  return '#4CAF50' // Green - on track
}

const TopicDetail = ({
  visible,
  threshold,
  masteryLimit,
  selectedNode,
  prerequisites,
  downstream,
  prerequisiteCount,
  downstreamCount,
  onSelectTopic,
  onDismiss,
  onStartPractice,
  blurTarget,
}: TopicDetailProps) => {
  const { label, occurrences, accuracy, masterable, mastered, nextReview, lastReviewed } =
    selectedNode
  const theme = useTheme()
  const hasPracticeQuestions = selectedNode.availableQuestionCount !== 0

  const connections = (
    <TopicConnections
      selectedNode={selectedNode}
      prerequisites={prerequisites}
      downstream={downstream}
      prerequisiteCount={prerequisiteCount}
      downstreamCount={downstreamCount}
      onSelectTopic={onSelectTopic}
    />
  )

  const setIcon = () => {
    if (!masterable) {
      return 'lock'
    } else if (mastered) {
      return 'check-circle'
    } else if (occurrences > 0) {
      return 'progress-clock'
    } else {
      return 'circle-outline'
    }
  }

  const getStatusColor = () => {
    if (!masterable) return '#9E9E9E'
    if (mastered) return '#4CAF50'
    if (occurrences > 0) return '#FF9800'
    return theme.colors.onSurfaceVariant
  }

  const getStatusText = () => {
    if (!masterable) return 'Locked'
    if (mastered) return 'Mastered'
    if (occurrences > 0) return 'In Progress'
    return 'Not Started'
  }

  const renderContent = () => {
    if (!hasPracticeQuestions) {
      return <View style={styles.contentContainer}>{connections}</View>
    }

    if (!masterable) {
      const progress = occurrences / threshold
      const remaining = threshold - occurrences

      return (
        <View style={styles.contentContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Icon source="lock" size={24} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>Locked</Text>
          </View>

          <Text style={styles.messageText}>
            Complete{' '}
            <Text style={styles.boldText}>
              {remaining} more question{remaining !== 1 ? 's' : ''}
            </Text>{' '}
            to unlock mastery tracking
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{occurrences}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Attempted
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{threshold}</Text>
              <Text style={styles.statLabel}>Required</Text>
            </View>
          </View>

          {connections}

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar
              progress={progress}
              color={progressBarColor(progress)}
              style={styles.progressBar}
            />
          </View>
        </View>
      )
    } else if (occurrences === 0) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.statusSummary}>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="circle-outline" size={22} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
                Not Started
              </Text>
            </View>
            {/* <Text style={[styles.statusDescription, { color: theme.colors.onSurfaceVariant }]}>
              You haven’t answered any questions on this topic yet.
            </Text> */}
          </View>
          {connections}
        </View>
      )
    } else {
      return (
        <View style={styles.contentContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Icon source={setIcon()} size={24} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>

          {mastered && accuracy >= 0.9 && (
            <Text style={styles.congratsText}>
              🎉 Outstanding mastery! Keep up the excellent work!
            </Text>
          )}

          {connections}

          {!mastered && (
            <Text style={[styles.targetText, { color: theme.colors.onSurfaceVariant }]}>
              Target: {Math.round(masteryLimit * 100)}% for mastery
            </Text>
          )}

          {/* Review Schedule Section */}
          {nextReview && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Icon source="calendar-clock" size={20} color={getReviewStatusColor(nextReview)} />
                <Text style={styles.reviewHeaderText}>Next Review</Text>
              </View>
              <View
                style={[
                  styles.reviewDateContainer,
                  {
                    backgroundColor: getReviewStatusColor(nextReview) + '15',
                    borderLeftColor: getReviewStatusColor(nextReview),
                  },
                ]}
              >
                <Text style={[styles.reviewDateText, { color: getReviewStatusColor(nextReview) }]}>
                  {formatReviewDate(nextReview)}
                </Text>
              </View>
            </View>
          )}

          {/* Last Reviewed Section */}
          {lastReviewed && (
            <View style={styles.lastReviewedSection}>
              <Text style={styles.lastReviewedLabel}>
                Last reviewed:{' '}
                {new Date(lastReviewed).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      )
    }
  }

  return (
    <GraphModal
      visible={visible}
      expanded
      contentKey={selectedNode.id}
      blurTarget={blurTarget}
      title={label}
      onDismiss={onDismiss}
      footer={
        <View style={styles.practiceActions}>
          {!hasPracticeQuestions && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
            >
              No practice questions are available for this topic yet.
            </Text>
          )}
          <Button
            mode="contained"
            icon="play"
            disabled={!hasPracticeQuestions}
            onPress={onStartPractice}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Practice This Topic
          </Button>
        </View>
      }
    >
      {renderContent()}
    </GraphModal>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  statusDescription: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    fontSize: 13,
    lineHeight: 19,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
  },
  congratsText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  targetText: {
    fontSize: 12,
    textAlign: 'center',
  },
  reviewSection: {
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reviewDateContainer: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  reviewDateText: {
    fontSize: 15,
    fontWeight: '600',
  },
  lastReviewedSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  lastReviewedLabel: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  practiceActions: {
    gap: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default TopicDetail
