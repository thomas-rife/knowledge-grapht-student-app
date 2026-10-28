import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Card, Icon, ProgressBar, useTheme } from 'react-native-paper'
import { Node } from './Node'

interface NodeProps {
  node: Node
  maxWidth: number
  threshold: number
  onPress: (id: number) => void
}

const getReviewTimeframe = (nextReview: string | null): string | null => {
  if (!nextReview) return null

  const reviewDate = new Date(nextReview)
  if (isNaN(reviewDate.getTime())) return null

  const now = Date.now()
  const diffMs = reviewDate.getTime() - now
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  // If overdue
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    if (overdueDays === 1) return '1d overdue'
    return `${overdueDays}d overdue`
  }

  // If due today
  if (diffDays === 0) return 'Due today'

  // If due in the future
  if (diffDays === 1) return '1d'
  if (diffDays < 7) return `${diffDays}d`

  const weeks = Math.floor(diffDays / 7)
  if (weeks === 1) return '1w'
  if (weeks < 4) return `${weeks}w`

  const months = Math.floor(diffDays / 30)
  if (months === 1) return '1mo'
  return `${months}mo`
}

const TopicNode = ({ node, maxWidth, onPress }: NodeProps) => {
  const { id, label, position, accuracy, occurrences, masterable, mastered, nextReview } = node
  const theme = useTheme()
  const hasQuestions = node.availableQuestionCount !== 0
  const hasAttempts = occurrences > 0
  const reviewTimeframe = hasQuestions && hasAttempts ? getReviewTimeframe(nextReview ?? null) : null
  const status = !masterable
    ? 'Locked'
    : !hasAttempts
      ? 'Not Started'
      : mastered
        ? 'Mastered'
        : 'In Progress'

  const progressBarColor = (progress: number) => {
    if (progress >= 1) return '#0CBFE9'
    else if (progress >= 0.75) return '#86DC3D'
    else if (progress >= 0.5) return '#FFDE21'
    else if (progress >= 0.25) return '#E27602'
    else return '#FF0000'
  }

  const getIconColor = () => {
    if (!masterable) return '#9E9E9E'
    if (!hasAttempts) return theme.colors.onSurfaceVariant
    if (mastered) return '#4CAF50'
    return '#FF9800'
  }

  const getIconName = () => {
    if (!masterable) return 'lock'
    if (!hasAttempts) return 'circle-outline'
    if (mastered) return 'check-circle'
    return 'progress-clock'
  }

  const getBadgeStyle = () => {
    if (reviewTimeframe?.includes('overdue')) {
      return [styles.reviewBadge, styles.overdueBadge]
    }
    if (reviewTimeframe?.includes('today')) {
      return [styles.reviewBadge, styles.dueTodayBadge]
    }
    return [styles.reviewBadge]
  }

  return (
    <View
      style={[
        styles.nodeWrapper,
        {
          left: position.x,
          top: position.y,
        },
      ]}
    >
      {/* Review timeframe badge - floating top left */}
      {reviewTimeframe && (
        <View style={getBadgeStyle()}>
          <Text style={styles.reviewText}>{reviewTimeframe}</Text>
        </View>
      )}

      <Card
        onPress={() => onPress(id)}
        accessibilityLabel={
          hasQuestions
            ? `${label}, ${status}, ${occurrences} question${occurrences === 1 ? '' : 's'} attempted`
            : `${label}, no questions available`
        }
        elevation={1}
        style={[
          styles.node,
          {
            width: maxWidth || 200,
          },
        ]}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.titleBar}>
            {hasQuestions && <Icon size={24} source={getIconName()} color={getIconColor()} />}
            <Text style={[styles.label, { color: theme.dark ? '#ffffff' : '#000000' }]}>
              {String(label)}
            </Text>
          </View>
          {hasQuestions ? (
            hasAttempts ? (
              <ProgressBar
                color={progressBarColor(accuracy)}
                progress={accuracy}
                style={styles.progressBar}
              />
            ) : (
              <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
                {status}
              </Text>
            )
          ) : (
            <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
              No questions available
            </Text>
          )}
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  nodeWrapper: {
    position: 'absolute',
  },
  node: {
    minHeight: 80,
    borderRadius: 8,
  },
  cardContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  titleBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
  },
  reviewBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    elevation: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  overdueBadge: {
    backgroundColor: '#F44336',
  },
  dueTodayBadge: {
    backgroundColor: '#FF9800',
  },
  reviewText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
})

export default TopicNode
