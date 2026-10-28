import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { Card, Chip, Divider, Surface, Text } from 'react-native-paper'
import { type Href, useGlobalSearchParams, useRouter } from 'expo-router'

import { supabase } from '@/supabaseClient'
import LoadingButton from '@/assets/components/common/LoadingButton'

type ReviewEntry = {
  topic: string
  score: number
}

const REVIEW_QUIZ_SIZE = 10

const Review = () => {
  const [reviewMap, setReviewMap] = useState<Record<string, number> | null>(null)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)

  const router = useRouter()
  const { classId: rawClassId } = useGlobalSearchParams<{ classId?: string | string[] }>()
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId

  const rankedTopics = useMemo<ReviewEntry[]>(() => {
    if (!reviewMap) return []

    return Object.entries(reviewMap)
      .map(([topic, score]) => ({
        topic,
        score: Number(score),
      }))
      .filter(entry => entry.topic.trim() && Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic))
      .slice(0, 3)
  }, [reviewMap])

  const fetchReview = useCallback(async () => {
    try {
      if (!classId || !Number.isInteger(Number(classId))) {
        setReviewMap(null)
        setReviewMessage('This class could not be opened. Return to Classes and try again.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.replace('/(auth)/login')
        return
      }

      const reviewRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/enrolled-class/${encodeURIComponent(classId)}/review`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!reviewRes.ok) {
        const errorText = await reviewRes.text()
        console.error('Review fetch failed:', reviewRes.status, errorText)
        alert(`Failed to fetch review priorities: ${errorText.slice(0, 200)}`)
        setReviewMap(null)
        setReviewMessage(null)
        return
      }

      const reviewJson = await reviewRes.json()
      const review = reviewJson?.review

      if (reviewJson?.source === 'none' || !review || typeof review !== 'object') {
        setReviewMap(null)
        setReviewMessage(
          typeof reviewJson?.message === 'string' && reviewJson.message.trim()
            ? reviewJson.message
            : 'Complete a lesson first to generate a personalized review plan.'
        )
        return
      }

      setReviewMessage(null)
      setReviewMap(review)
    } catch (error) {
      console.error('Error fetching review priorities:', error)
      alert(`Failed to fetch review priorities. Error: ${error}`)
      setReviewMap(null)
      setReviewMessage(null)
    } finally {
      setRefreshing(false)
    }
  }, [classId, router])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  const refresh = useCallback(() => {
    setRefreshing(true)
    fetchReview()
  }, [fetchReview])

  const topTopic = rankedTopics[0] ?? null

  const handleReview = useCallback(async () => {
    if (reviewLoading) return

    if (!reviewMap || Object.keys(reviewMap).length === 0) {
      alert(
        'No review data available yet. Complete some lessons first to build your knowledge graph!'
      )
      return
    }

    try {
      setReviewLoading(true)
      router.push({
        pathname: '/practice/questions',
        params: {
          classId: String(classId),
          review: '1',
          topic: topTopic?.topic ?? '',
          reviewData: JSON.stringify(reviewMap),
          reviewQuizSize: String(REVIEW_QUIZ_SIZE),
        },
      } as unknown as Href)
    } catch (error) {
      console.error('Error creating review quiz:', error)
      alert(`Failed to create quiz. Please try again. Error: ${error}`)
    } finally {
      setReviewLoading(false)
    }
  }, [classId, reviewLoading, reviewMap, router, topTopic])

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Surface style={styles.hero} elevation={1}>
          <Text variant="headlineSmall" style={styles.heroTitle}>
            Personalized Review
          </Text>
          <Text variant="bodyMedium" style={styles.heroText}>
            This review mode looks at your recent topic performance and the class knowledge graph,
            then picks the topic most likely to strengthen the concepts you are still shaky on.
          </Text>

          <Divider style={styles.heroDivider} />

          <Text variant="labelLarge" style={styles.sectionLabel}>
            Recommended next focus
          </Text>
          <Text variant="titleLarge" style={styles.topTopic}>
            {topTopic ? topTopic.topic : 'No recommendation yet'}
          </Text>
          <Text variant="bodyMedium" style={styles.heroText}>
            {topTopic
              ? `Start a targeted quiz based on this topic.`
              : reviewMessage || 'Finish a few lessons to generate a meaningful recommendation set.'}
          </Text>

          <LoadingButton
            mode="contained"
            onPress={handleReview}
            loading={reviewLoading}
            disabled={reviewLoading || !topTopic}
            style={styles.primaryButton}
          >
            Start Review Quiz
          </LoadingButton>
        </Surface>

        <Card style={styles.card}>
          <Card.Title title="Current Review Priorities" />
          <Card.Content>
            {rankedTopics.length > 0 ? (
              <View style={styles.topicList}>
                {rankedTopics.map((entry, index) => (
                  <View key={entry.topic} style={styles.topicRow}>
                    <Chip compact style={styles.rankChip}>
                      #{index + 1}
                    </Chip>
                    <View style={styles.topicCopy}>
                      <Text variant="titleMedium">{entry.topic}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium" style={styles.cardText}>
                {reviewMessage ||
                  'No review priorities are available yet for this class. Complete more lesson quizzes and pull to refresh.'}
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroText: {
    lineHeight: 21,
    opacity: 0.8,
  },
  heroDivider: {
    marginVertical: 6,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.6,
  },
  topTopic: {
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 8,
  },
  card: {
    borderRadius: 18,
  },
  cardText: {
    lineHeight: 20,
  },
  topicList: {
    gap: 12,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankChip: {
    minWidth: 58,
    justifyContent: 'center',
  },
  topicCopy: {
    flex: 1,
  },
  topicScore: {
    opacity: 0.7,
    marginTop: 2,
  },
})

export default Review
