import React, { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Button, Text, Card, Chip, Divider, Icon } from 'react-native-paper'
import { type Href, useFocusEffect, useRouter, useGlobalSearchParams } from 'expo-router'
import { supabase } from '@/supabaseClient'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'

type Lesson = {
  lesson_id: number
  name: string
  topics?: string[]
}

const Lessons = () => {
  const [rows, setRows] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const { classId: rawClassId, className: rawClassName } = useGlobalSearchParams<{
    classId?: string | string[]
    className?: string | string[]
  }>()
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId
  const className = Array.isArray(rawClassName) ? rawClassName[0] : rawClassName

  const routeToLesson = (id: number) => {
    router.push({
      pathname: '/practice/questions',
      params: {
        classId: String(classId),
        className: className || '',
        lessonName: String(id),
        quizMode: 'lesson',
        launchSource: 'lesson_screen',
      },
    } as unknown as Href)
  }

  const fetchLessons = useCallback(async () => {
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
      if (!base) throw new Error('The app API URL is not configured.')

      const response = await fetch(
        `${base}/user/enrolled-class/${encodeURIComponent(classId)}/lessons`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      const data = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || `Lessons could not be loaded (${response.status})`)
      }

      setRows(
        data.map(({ lesson_id, name, topics }: Lesson) => ({
          lesson_id,
          name,
          topics,
        }))
      )
      setError(null)
    } catch (fetchError) {
      console.error('Lessons fetch failed:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Lessons could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [classId, router])

  useFocusEffect(
    useCallback(() => {
      void fetchLessons()
    }, [fetchLessons])
  )

  const refresh = useCallback(() => {
    setRefreshing(true)
    void fetchLessons()
  }, [fetchLessons])

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
          Your Lessons
        </Text>
      </View>
      <Divider bold={true} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && (
          <View style={styles.statusCard}>
            <LoadingIndicator />
            <Text variant="bodyLarge">Loading lessons…</Text>
          </View>
        )}

        {!loading && error && (
          <Card style={styles.errorCard}>
            <Card.Content style={styles.statusCard}>
              <Icon source="cloud-alert" size={32} />
              <Text variant="titleMedium">Lessons are unavailable</Text>
              <Text variant="bodyMedium" style={styles.statusText}>
                {error}
              </Text>
              <Button mode="outlined" onPress={refresh}>
                Try Again
              </Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.list}>
          {!error && rows.map(row => (
            <Card
              key={row.lesson_id}
              style={styles.card}
              onPress={() => routeToLesson(row.lesson_id)}
            >
              <Card.Title
                title={row.name}
                titleVariant="titleLarge"
                titleStyle={styles.lessonTitle}
                titleNumberOfLines={0}
              />
              <Divider bold={true} style={{ marginBottom: 5 }} />
              {row.topics && (
                <Card.Content>
                  <Text variant="titleMedium" style={styles.topicsLabel}>
                    Topics
                  </Text>

                  <View style={styles.topicsList}>
                    {row.topics.map((topic: string, index: number) => (
                      <Chip style={styles.topicItem} key={index}>
                        <Text variant="bodyMedium" style={styles.topicText}>
                          {topic}
                        </Text>
                      </Chip>
                    ))}
                  </View>
                </Card.Content>
              )}
            </Card>
          ))}

          {!loading && !error && rows.length === 0 && !refreshing && (
            <View style={styles.noLessonsContainer}>
              <Text variant="titleLarge" style={styles.noLessonsText}>
                No lessons available yet...
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default Lessons

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 15,
    zIndex: 1,
  },
  container: {
    padding: 16,
    // Leave enough scrollable space for the floating iOS 26 liquid-glass tab bar.
    paddingBottom: 112,
  },
  list: {
    gap: 12,
  },
  statusCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  statusText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  errorCard: {
    borderRadius: 18,
    marginBottom: 12,
  },
  card: {
    padding: 8,
    borderRadius: 8,
    elevation: 2,
  },
  lessonTitle: { paddingBottom: 8 },
  topicsLabel: {
    paddingBottom: 2,
    textAlign: 'center',
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  topicItem: {
    borderRadius: 4,
  },
  topicText: {},
  noLessonsContainer: {
    marginTop: '50%',
    alignItems: 'center',
  },
  noLessonsText: {},
})
