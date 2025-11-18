import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Chip, Divider } from 'react-native-paper'
import { useRouter, useLocalSearchParams } from 'expo-router'

type Lesson = {
  lesson_id: number
  name: string
  topics?: string[]
}

const Lessons = () => {
  const [rows, setRows] = useState<Array<Lesson>>()
  const [refreshing, setRefreshing] = useState<boolean>(true)

  const router = useRouter()
  const { classId } = useLocalSearchParams()

  const routeToLesson = (id: number) => {
    router.push(`../questions?classId=${classId}&lessonName=${id}`)
  }

  useEffect(() => {
    const fetchLessons = async () => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/enrolled-class/${classId}/lessons`
      )
      const data = await response.json()
      const lessons = data.map(({ lesson_id, name, topics }: Lesson) => ({
        id: lesson_id,
        name,
        topics,
      }))
      setRows(lessons)
    }

    fetchLessons().then(() => setRefreshing(false))
  }, [refreshing])

  const refresh = useCallback(() => {
    setRefreshing(true)
  }, [])

  // TODO: Include RefreshControl for spinner
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
        <View style={styles.list}>
          {rows?.map((row: any) => (
            <Card key={row.id} style={styles.card} onPress={() => routeToLesson(row.id)}>
              <Card.Title
                title={row.name}
                titleVariant="titleLarge"
                titleStyle={styles.lessonTitle}
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

          {rows?.length === 0 && !refreshing && (
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
    margin: 15,
    zIndex: 1,
  },
  container: {
    padding: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 8,
    borderRadius: 8,
    elevation: 2,
  },
  lessonTitle: {},
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
  noLessonsText: {
    // color: MD3Colors.neutral50,
  },
})
