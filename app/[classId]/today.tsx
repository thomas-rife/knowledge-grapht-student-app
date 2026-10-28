import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import {
  Button,
  Card,
  Chip,
  Icon,
  ProgressBar,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper'
import { type Href, useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router'

import { syncStudyReminders } from '@/services/notifications'
import { formatStudyDate, hasThreeDayCadence, type StudyStreak } from '@/services/studyCadence'
import { getTodayRecommendationLabel } from '@/services/todayPresentation'
import { supabase } from '@/supabaseClient'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'

type TodayPayload = {
  contract_version: string
  class: { id: number; name: string }
  daily_goal: { kind: 'quiz_completion'; required: number; completed: number }
  streak: StudyStreak
  recommendation: null | {
    topic: string
    due_status: 'overdue' | 'due_today' | 'recommended'
    next_review: string | null
    prerequisites: string[]
    supports: string[]
    explanation: string
    explanation_source: 'gemini' | 'deterministic'
    quiz: { question_type: 'multiple-choice'; requested_questions: number }
  }
  priorities: { topic: string; score: number }[]
  recommendation_snapshot: null | { id: string; created_at: string }
  message: string | null
}

const getTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const dayLabel = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString(undefined, { weekday: 'narrow' })
}

const Today = () => {
  const router = useRouter()
  const theme = useTheme()
  const { classId: rawClassId, className: rawClassName } = useGlobalSearchParams<{
    classId?: string | string[]
    className?: string | string[]
  }>()
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId
  const routeClassName = Array.isArray(rawClassName) ? rawClassName[0] : rawClassName
  const [today, setToday] = useState<TodayPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToday = useCallback(async () => {
    try {
      if (!classId || !Number.isFinite(Number(classId))) {
        setError('This class could not be opened. Return to Classes and try again.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.replace('/(auth)/login')
        return
      }

      const base = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
      const timezone = encodeURIComponent(getTimeZone())
      const response = await fetch(
        `${base}/user/enrolled-class/${encodeURIComponent(classId)}/today?timezone=${timezone}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) {
        throw new Error(payload?.error || `Today could not be loaded (${response.status})`)
      }

      setToday(payload as TodayPayload)
      setError(null)
      const streak = (payload as TodayPayload).streak
      void syncStudyReminders({
        classId,
        className: (payload as TodayPayload).class?.name || routeClassName,
        currentStreak: streak.current_streak,
        studiedToday: streak.studied_today,
        nextReviewDueOn: streak.next_review_due_on,
        cadenceDays: streak.cadence_days,
      })
    } catch (fetchError) {
      console.error('Today fetch failed:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Today could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [classId, routeClassName, router])

  useFocusEffect(
    useCallback(() => {
      void fetchToday()
    }, [fetchToday])
  )

  const refresh = useCallback(() => {
    setRefreshing(true)
    void fetchToday()
  }, [fetchToday])

  const startTopicQuiz = useCallback(
    (topic: string, questionCount = 10, quizMode: 'daily_review' | 'topic_practice') => {
      if (!classId) return
      router.push({
        pathname: '/practice/questions',
        params: {
          classId,
          className: today?.class?.name || routeClassName || '',
          review: '1',
          topic,
          reviewQuizSize: String(questionCount),
          quizMode,
          launchSource: 'today',
          recommendationSnapshotId: today?.recommendation_snapshot?.id || '',
        },
      } as unknown as Href)
    },
    [classId, routeClassName, router, today?.class?.name, today?.recommendation_snapshot?.id]
  )

  if (loading && !today) {
    return (
      <View style={styles.centered}>
        <LoadingIndicator />
        <Text variant="bodyLarge">Preparing today’s study plan…</Text>
      </View>
    )
  }

  const streak = today?.streak
  const recommendation = today?.recommendation
  const threeDayCadence = hasThreeDayCadence(streak)
  const goalComplete = threeDayCadence
    ? streak?.covered_today === true
    : streak?.studied_today === true
  const days = (threeDayCadence ? streak?.timeline : streak?.week) ?? []

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Surface style={styles.streakBar} elevation={2}>
        <View style={styles.streakHeading}>
          <View style={[styles.flameCircle, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon
              source={goalComplete ? 'check-bold' : 'fire'}
              size={26}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.streakCopy}>
            <Text variant="titleLarge" style={styles.bold}>
              {streak?.current_streak ?? 0} {threeDayCadence ? 'study' : 'day'} streak
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {threeDayCadence
                ? goalComplete
                  ? `Covered through ${formatStudyDate(streak?.covered_through)}`
                  : 'Review due today'
                : goalComplete
                  ? 'Today is complete, good job!'
                  : 'Complete one quiz to keep it going'}
            </Text>
          </View>
          {/* <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            {threeDayCadence
              ? goalComplete
                ? 'Covered'
                : 'Due'
              : goalComplete
                ? '1 / 1'
                : '0 / 1'}
          </Text> */}
        </View>

        <ProgressBar progress={goalComplete ? 1 : 0} style={styles.goalProgress} />

        <View style={styles.weekGuide}>
          <Text variant="labelSmall" style={styles.muted}>
            {threeDayCadence ? 'One quiz covers 3 days' : 'Last 7 days'}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            {threeDayCadence ? 'Today + 2 ahead' : 'Today →'}
          </Text>
        </View>

        <View style={styles.weekRow}>
          {days.map((day, index) => {
            const isToday = threeDayCadence ? day.date === streak?.today : index === days.length - 1
            return (
              <View
                key={day.date}
                style={styles.dayColumn}
                accessible
                accessibilityLabel={`${day.date}${isToday ? ', today' : ''}: ${day.completed ? 'quiz completed' : day.covered ? 'covered by a completed quiz' : 'not covered'}`}
              >
                <Text
                  variant="labelSmall"
                  style={
                    isToday ? { color: theme.colors.primary, fontWeight: '700' } : styles.muted
                  }
                >
                  {dayLabel(day.date)}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: day.completed
                        ? theme.colors.primary
                        : day.covered
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      borderColor: isToday ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  {(day.completed || day.covered) && (
                    <Icon
                      source={day.completed ? 'check' : 'shield-outline'}
                      size={13}
                      color={day.completed ? theme.colors.onPrimary : theme.colors.primary}
                    />
                  )}
                </View>
                <Text
                  variant="labelSmall"
                  style={
                    isToday ? { color: theme.colors.primary, fontWeight: '700' } : styles.muted
                  }
                >
                  {isToday ? 'Today' : day.date.slice(-2)}
                </Text>
              </View>
            )
          })}
        </View>
        {threeDayCadence && (
          <Text variant="bodySmall" style={styles.muted}>
            {goalComplete ? `Next review due ${formatStudyDate(streak?.next_review_due_on)}. ` : ''}
          </Text>
        )}
      </Surface>

      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.bold}>
          Today
        </Text>
        <Text variant="bodyLarge" style={styles.muted}>
          One focused quiz focused on the topic you need to review the most.
        </Text>
      </View>

      {error && (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Icon source="cloud-alert" size={30} color={theme.colors.error} />
            <Text variant="titleMedium">We couldn’t build today’s plan</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {error}
            </Text>
            <Button mode="outlined" onPress={refresh}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      )}

      {!error && recommendation && (
        <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.recommendationHeader}>
              <Chip icon="target" compact>
                {getTodayRecommendationLabel(recommendation.due_status, goalComplete)}
              </Chip>
            </View>
            <Text variant="headlineSmall" style={styles.bold}>
              {recommendation.topic}
            </Text>
            <Text variant="bodyLarge" style={styles.explanation}>
              {recommendation.explanation}
            </Text>

            {recommendation.supports.length > 0 && (
              <View style={styles.relationshipBlock}>
                <Text variant="labelLarge">Helps Master:</Text>
                <View style={styles.chips}>
                  {recommendation.supports.slice(0, 3).map(topic => (
                    <Chip compact key={topic}>
                      {topic}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            <Button
              mode="contained"
              icon={goalComplete ? 'refresh' : 'play'}
              onPress={() =>
                startTopicQuiz(
                  recommendation.topic,
                  recommendation.quiz.requested_questions,
                  'daily_review'
                )
              }
              contentStyle={styles.primaryButtonContent}
            >
              {goalComplete ? 'Practice' : 'Start Today’s Review'}
            </Button>
          </Card.Content>
        </Card>
      )}

      {!error && !recommendation && (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Icon source="sprout" size={34} color={theme.colors.primary} />
            <Text variant="titleLarge" style={styles.bold}>
              Build your first recommendation
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {today?.message ||
                'Complete a lesson quiz and your personalized review will appear here.'}
            </Text>
            <Button
              mode="contained"
              onPress={() =>
                router.navigate({
                  pathname: '/[classId]/lessons',
                  params: {
                    classId: String(classId),
                    className: today?.class?.name || routeClassName || '',
                  },
                })
              }
            >
              Browse Lessons
            </Button>
          </Card.Content>
        </Card>
      )}

      {(today?.priorities?.length ?? 0) > 1 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.bold}>
            Also worth reviewing
          </Text>
          {/* <Text variant="bodyMedium" style={styles.muted}>
            Target another recommended topic if you have more time.
          </Text> */}
          {today?.priorities.slice(1).map((priority, index) => (
            <Surface key={priority.topic} style={styles.priorityRow} elevation={1}>
              <View style={styles.priorityRank}>
                <Text variant="labelLarge">{index + 2}</Text>
              </View>
              <Text variant="titleMedium" style={styles.priorityTitle}>
                {priority.topic}
              </Text>
              <Button compact onPress={() => startTopicQuiz(priority.topic, 10, 'topic_practice')}>
                Practice
              </Button>
            </Surface>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  container: {
    padding: 16,
    paddingBottom: 112,
    gap: 18,
  },
  streakBar: {
    borderRadius: 22,
    padding: 16,
    gap: 13,
  },
  streakHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCopy: { flex: 1 },
  bold: { fontWeight: '700' },
  muted: { opacity: 0.68 },
  goalProgress: { height: 7, borderRadius: 8 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayColumn: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { gap: 5 },
  card: { borderRadius: 24, overflow: 'hidden' },
  cardContent: { paddingVertical: 8, gap: 15 },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  explanation: { lineHeight: 24 },
  relationshipBlock: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryButtonContent: { minHeight: 50 },
  section: { gap: 10 },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  priorityRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  priorityTitle: { flex: 1, fontWeight: '600' },
})

export default Today
