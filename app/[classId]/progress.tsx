import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Chip, Icon, ProgressBar, Surface, Text, useTheme } from 'react-native-paper'
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router'

import { supabase } from '@/supabaseClient'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'
import { formatStudyDate, hasThreeDayCadence, type StudyStreak } from '@/services/studyCadence'

type DailyActivity = {
  date: string
  completed_quizzes: number
  questions_answered: number
  correct_answers: number
  accuracy: number | null
}

type ModeBreakdown = {
  quiz_mode: 'lesson' | 'daily_review' | 'topic_practice' | 'legacy_review'
  completed: number
}

type TopicPerformance = {
  topic: string
  attempts: number
  correct: number
  accuracy: number | null
}

type RecentSession = {
  id: string
  quiz_mode: ModeBreakdown['quiz_mode']
  status: 'completed' | 'abandoned'
  focus_topic_label: string | null
  question_count: number
  answered_count: number
  correct_count: number
  started_at: string | null
  ended_at: string | null
}

type ProgressPayload = {
  contract_version: string
  class: { id: number; name: string }
  summary: {
    completed_quizzes: number
    abandoned_quizzes: number
    questions_answered: number
    correct_answers: number
    accuracy: number | null
    study_days: number
  }
  streak: StudyStreak
  daily_activity: DailyActivity[]
  mode_breakdown: ModeBreakdown[]
  recent_sessions: RecentSession[]
  topic_performance: TopicPerformance[]
}

const getTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const percent = (value: number | null) =>
  value == null || !Number.isFinite(value) ? '—' : `${Math.round(value * 100)}%`

const dayLabel = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString(undefined, { weekday: 'narrow' })
}

const sessionDate = (value: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const modeDetails = (mode: ModeBreakdown['quiz_mode']) => {
  if (mode === 'lesson') return { label: 'Lessons', icon: 'book-open-variant' }
  if (mode === 'daily_review') return { label: 'Today reviews', icon: 'target' }
  if (mode === 'topic_practice') return { label: 'Topic practice', icon: 'graph-outline' }
  return { label: 'Earlier reviews', icon: 'history' }
}

const Progress = () => {
  const theme = useTheme()
  const router = useRouter()
  const { classId: rawClassId } = useGlobalSearchParams<{
    classId?: string | string[]
  }>()
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId
  const [progress, setProgress] = useState<ProgressPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      if (!classId || !Number.isFinite(Number(classId))) {
        throw new Error('This class could not be opened.')
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
        `${base}/user/enrolled-class/${encodeURIComponent(classId)}/progress?timezone=${timezone}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) {
        throw new Error(payload?.error || `Progress could not be loaded (${response.status})`)
      }

      setProgress(payload as ProgressPayload)
      setError(null)
    } catch (fetchError) {
      console.error('Progress fetch failed:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Progress could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [classId, router])

  useFocusEffect(
    useCallback(() => {
      void fetchProgress()
    }, [fetchProgress])
  )

  const refresh = useCallback(() => {
    setRefreshing(true)
    void fetchProgress()
  }, [fetchProgress])

  if (loading && !progress) {
    return (
      <View style={styles.centered}>
        <LoadingIndicator />
        <Text variant="bodyLarge">Building your progress view…</Text>
      </View>
    )
  }

  if (error && !progress) {
    return (
      <View style={styles.centered}>
        <Icon source="chart-box-outline" size={38} color={theme.colors.error} />
        <Text variant="titleLarge">Progress is unavailable</Text>
        <Text variant="bodyMedium" style={styles.centeredCopy}>
          {error}
        </Text>
      </View>
    )
  }

  const summary = progress?.summary
  const streak = progress?.streak
  const threeDayCadence = hasThreeDayCadence(streak)
  const covered = threeDayCadence ? streak?.covered_today : streak?.studied_today
  const dailyActivity = progress?.daily_activity ?? []
  const maxDailyQuizzes = Math.max(1, ...dailyActivity.map(day => day.completed_quizzes))
  const weekQuizTotal = dailyActivity.reduce((sum, day) => sum + day.completed_quizzes, 0)
  const completedTotal = Math.max(1, summary?.completed_quizzes ?? 0)
  const topTopics = (progress?.topic_performance ?? []).slice(0, 6)

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.bold}>
          Progress
        </Text>
        <Text variant="bodyLarge" style={styles.muted}>
          Your study activity and performance in this course.
        </Text>
      </View>

      <Surface
        style={[styles.streakCard, { backgroundColor: theme.colors.primaryContainer }]}
        elevation={1}
      >
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
          <Icon source="fire" size={28} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.flex}>
          <Text variant="headlineSmall" style={styles.bold}>
            {streak?.current_streak ?? 0} {threeDayCadence ? 'study' : 'day'} streak
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Best: {streak?.longest_streak ?? 0} {threeDayCadence ? 'study days' : 'days'}
          </Text>
          {threeDayCadence && covered && (
            <Text variant="bodySmall">Next due {formatStudyDate(streak?.next_review_due_on)}</Text>
          )}
        </View>
        <Chip compact icon={covered ? 'check' : 'clock-outline'}>
          {threeDayCadence
            ? covered
              ? 'Covered'
              : 'Due today'
            : covered
              ? 'Done today'
              : 'Open today'}
        </Chip>
      </Surface>

      <View style={styles.metricsGrid}>
        <Surface style={styles.metricCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.bold}>
            {summary?.completed_quizzes ?? 0}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            Quizzes completed
          </Text>
        </Surface>
        <Surface style={styles.metricCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.bold}>
            {percent(summary?.accuracy ?? null)}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            Overall accuracy
          </Text>
        </Surface>
        <Surface style={styles.metricCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.bold}>
            {summary?.questions_answered ?? 0}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            Questions answered
          </Text>
        </Surface>
        <Surface style={styles.metricCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.bold}>
            {summary?.abandoned_quizzes ?? 0}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            Sessions exited early
          </Text>
        </Surface>
      </View>

      <Surface style={styles.sectionCard} elevation={1}>
        <View style={styles.sectionHeading}>
          <View>
            <Text variant="titleLarge" style={styles.bold}>
              Last 7 days
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {weekQuizTotal} completed {weekQuizTotal === 1 ? 'quiz' : 'quizzes'}
            </Text>
          </View>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            Today →
          </Text>
        </View>

        <View style={styles.chart}>
          {dailyActivity.map((day, index) => {
            const isToday = index === dailyActivity.length - 1
            const barHeight =
              day.completed_quizzes > 0 ? 14 + (day.completed_quizzes / maxDailyQuizzes) * 54 : 6
            return (
              <View key={day.date} style={styles.barColumn}>
                <Text variant="labelSmall" style={styles.barValue}>
                  {day.completed_quizzes || ''}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor:
                        day.completed_quizzes > 0
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                      borderColor: isToday ? theme.colors.primary : 'transparent',
                    },
                  ]}
                />
                <Text
                  variant="labelSmall"
                  style={
                    isToday ? { color: theme.colors.primary, fontWeight: '700' } : styles.muted
                  }
                >
                  {dayLabel(day.date)}
                </Text>
              </View>
            )
          })}
        </View>
      </Surface>

      <Surface style={styles.sectionCard} elevation={1}>
        <Text variant="titleLarge" style={styles.bold}>
          Study mix
        </Text>
        <View style={styles.listGap}>
          {(progress?.mode_breakdown ?? []).map(mode => {
            const details = modeDetails(mode.quiz_mode)
            return (
              <View key={mode.quiz_mode} style={styles.modeRow}>
                <Icon source={details.icon} size={22} color={theme.colors.primary} />
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <Text variant="titleSmall">{details.label}</Text>
                    <Text variant="labelLarge">{mode.completed}</Text>
                  </View>
                  <ProgressBar
                    progress={mode.completed / completedTotal}
                    style={styles.slimProgress}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </Surface>

      <Surface style={styles.sectionCard} elevation={1}>
        <Text variant="titleLarge" style={styles.bold}>
          Topic performance
        </Text>

        {topTopics.length > 0 ? (
          <View style={styles.listGap}>
            {topTopics.map(topic => (
              <View key={topic.topic} style={styles.topicRow}>
                <View style={styles.rowBetween}>
                  <Text variant="titleSmall" style={styles.flex}>
                    {topic.topic}
                  </Text>
                  <Text variant="labelLarge">{percent(topic.accuracy)}</Text>
                </View>
                <ProgressBar progress={topic.accuracy ?? 0} style={styles.slimProgress} />
                <Text variant="labelSmall" style={styles.muted}>
                  {topic.correct} correct of {topic.attempts}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="bodyMedium" style={styles.emptyCopy}>
            Complete a new quiz to start building topic-level history.
          </Text>
        )}
      </Surface>

      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.bold}>
          Recent sessions
        </Text>
        {(progress?.recent_sessions ?? []).length > 0 ? (
          progress?.recent_sessions.slice(0, 5).map(session => {
            const details = modeDetails(session.quiz_mode)
            const accuracy =
              session.answered_count > 0 ? session.correct_count / session.answered_count : null
            return (
              <Surface key={session.id} style={styles.sessionRow} elevation={1}>
                <View
                  style={[styles.smallIcon, { backgroundColor: theme.colors.primaryContainer }]}
                >
                  <Icon source={details.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text variant="titleSmall">{session.focus_topic_label || details.label}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {sessionDate(session.ended_at)} · {session.answered_count} answered
                  </Text>
                </View>
                <View style={styles.sessionResult}>
                  <Text variant="labelLarge">
                    {session.status === 'completed' ? percent(accuracy) : 'Exited'}
                  </Text>
                  <Text variant="labelSmall" style={styles.muted}>
                    {session.status === 'completed' ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
              </Surface>
            )
          })
        ) : (
          <Surface style={styles.emptyCard} elevation={1}>
            <Icon source="sprout" size={30} color={theme.colors.primary} />
            <Text variant="bodyMedium">Your completed quizzes will appear here.</Text>
          </Surface>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 28,
  },
  centeredCopy: { textAlign: 'center', opacity: 0.7 },
  container: {
    padding: 16,
    paddingBottom: 112,
    gap: 18,
  },
  intro: { gap: 5 },
  bold: { fontWeight: '700' },
  muted: { opacity: 0.68 },
  flex: { flex: 1 },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 18,
    gap: 3,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
  },
  section: { gap: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  chart: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  barValue: { minHeight: 15 },
  bar: {
    width: 24,
    minHeight: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  listGap: { gap: 16 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  slimProgress: {
    height: 7,
    borderRadius: 6,
    marginTop: 7,
  },
  topicRow: { gap: 2 },
  emptyCopy: { marginTop: 4, opacity: 0.68 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
  },
  smallIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionResult: { alignItems: 'flex-end' },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    borderRadius: 18,
  },
})

export default Progress
