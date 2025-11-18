import React, { useState, useEffect, useMemo, memo } from 'react'
import { View, StyleSheet, ScrollView, ViewStyle, Image, Linking } from 'react-native'
import {
  Text,
  Surface,
  Button,
  Portal,
  Dialog,
  useTheme,
  Icon,
  ActivityIndicator,
} from 'react-native-paper'
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router'
import MultipleChoiceQuestion from '@/assets/components/lessons/MultipleChoiceQuestion'
import RearrangeQuestion from '@/assets/components/lessons/RearrangeQuestion'
import {
  Question,
  MultipleChoiceData,
  RearrangeData,
} from '@/assets/components/lessons/Questions.d'
import { supabase } from '@/supabaseClient'

// Resolves an image URL that could be absolute, a Supabase public object URL, or a bare storage path.
function resolveImageUrl(raw?: string | null): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return ''
  // Already absolute http(s)
  if (/^https?:\/\//i.test(s)) return s
  // If it's a Supabase public object URL missing domain (e.g., "/storage/v1/object/public/...")
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  if (s.startsWith('/storage/v1/object/public') && base) return `${base}${s}`
  // If it looks like a bare storage path (e.g., "question-images/foo.png"), try common buckets
  if (base) {
    // Heuristic: assume "question-images" bucket if a bucket isn't clearly included
    const looksBucketPrefixed = s.includes('/')
    const withBucket = looksBucketPrefixed ? s : `question-images/${s}`
    return `${base}/storage/v1/object/public/${withBucket}`
  }
  return s
}

function summarizeTopicsForAttempt(qs: Question[], marks: boolean[]) {
  const byTopic = new Map<string, { attempts: number; correct: number }>()
  qs.forEach((q, i) => {
    const topics = Array.isArray(q.topics) ? q.topics : []
    topics.forEach(t => {
      const key = String(t || '').trim()
      if (!key) return
      if (!byTopic.has(key)) byTopic.set(key, { attempts: 0, correct: 0 })
      const row = byTopic.get(key)!
      row.attempts += 1
      if (marks[i]) row.correct += 1
    })
  })
  return Array.from(byTopic.entries()).map(([topic, stats]) => ({ topic, ...stats }))
}

const Questions = () => {
  /* Base variables */
  const router = useRouter()
  const navigation = useNavigation()
  const theme = useTheme()
  const { classId, lessonName } = useLocalSearchParams()

  /* State variables - controls for visible components */
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [quizComplete, setComplete] = useState<boolean>(false)
  const [showExitDialog, setExitDialog] = useState<boolean>(false)
  const [showFeedback, setFeedback] = useState<boolean>(false)
  const [showQuizTopics, setQuizTopics] = useState<boolean>(false)

  /* Quiz variables - handles data for quiz processing */
  const [questions, setQuestions] = useState<Array<Question & { image_url?: string | null }>>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [finalAnswers, setFinalAnswers] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [finalPushed, setFinalPushed] = useState(false)
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({})

  const currentQuestion = questions[questionIndex]

  const memoizedQuestion = useMemo<MultipleChoiceData | RearrangeData | null>(() => {
    if (!currentQuestion) return null

    switch (currentQuestion.question_type) {
      case 'multiple-choice':
        return {
          ...currentQuestion,
          answer_options: currentQuestion.answer_options as string[],
          question_type: 'multiple-choice',
        }
      case 'rearrange':
        return {
          ...currentQuestion,
          question_type: 'rearrange',
          //@ts-ignore
          answer_options: currentQuestion.answer_options[1].studentView[0],
        }
    }
  }, [currentQuestion])

  useEffect(() => {
    let isMounted = true

    console.log('Auth useEffect started')

    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('getSession full response:', {
        session: data?.session,
        user: data?.session?.user,
        userId: data?.session?.user?.id,
        error: error,
      })
      if (isMounted && data?.session?.user?.id) {
        setUid(data.session.user.id)
        setAuthReady(true)
      } else if (isMounted) {
        console.warn('No session found in getSession')
        setAuthReady(true) // Still set to true so app doesn't hang
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event)
      console.log('Auth state change session:', session)
      console.log('Auth state change userId:', session?.user?.id)
      if (isMounted) {
        setUid(session?.user?.id ?? null)
        setAuthReady(true)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  /* Fetches questions from API - Runs once on initial render */
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true)
      try {
        const base = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
        const cid = String(classId)
        const rawLesson = String(lessonName ?? '')
        const lessonSlug = encodeURIComponent(rawLesson)
        const isNumericLesson = /^\d+$/.test(rawLesson)
        const lid = isNumericLesson ? rawLesson : ''

        // Attach Supabase session token so backend verifyUser passes
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const authHeader = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}

        const candidates = [
          `${base}/mobile/classes/${cid}/lessons/${lessonSlug}/questions`,
          `${base}/user/enrolled-class/${cid}/lesson/${lessonSlug}/questions`,
          ...(isNumericLesson
            ? [
                `${base}/mobile/classes/${cid}/lessons/${lid}/questions`,
                `${base}/user/enrolled-class/${cid}/lesson/${lid}/questions`,
                `${base}/mobile/questions?class_id=${cid}&lesson_id=${lid}`,
              ]
            : []),
        ]
        console.log('Questions fetch trying routes:', candidates)

        let parsed: any = null
        let ok = false
        let lastStatus = 0
        let lastPreview = ''
        let lastTried = ''

        for (const url of candidates) {
          lastTried = url
          const resp = await fetch(url, { headers: { Accept: 'application/json', ...authHeader } })
          lastStatus = resp.status
          const raw = await resp.text()
          try {
            parsed = raw ? JSON.parse(raw) : null
          } catch {
            lastPreview = raw?.slice(0, 200) || ''
            continue
          }
          if (!resp.ok) {
            lastPreview =
              typeof parsed?.error === 'string' ? parsed.error : raw?.slice(0, 200) || ''
            continue
          }
          ok = true
          break
        }

        if (!ok) {
          console.warn('Questions fetch failed across routes:', {
            lastStatus,
            lastUrl: lastTried,
            preview: lastPreview,
          })
          throw new Error(
            `questions endpoint not found or returned non-JSON (status ${lastStatus})`
          )
        }

        const rows = Array.isArray(parsed) ? parsed : parsed?.questions
        if (!Array.isArray(rows)) {
          console.warn('Questions fetch unexpected JSON shape:', parsed)
          throw new Error('Unexpected questions payload')
        }

        const receivedQuestions = rows.map((q: any) => ({
          question_id: q.question_id,
          question_type: q.question_type,
          prompt: q.prompt,
          snippet: q.snippet,
          topics: q.topics,
          answer: q.answer,
          answer_options: q.answer_options,
          lesson_id: q.lesson_id,
          image_url: q.image_url ?? null,
        })) as Array<Question & { image_url?: string | null }>

        if (receivedQuestions.length < 1) {
          throw new Error('This quiz has no questions.')
        }

        setQuestions(receivedQuestions)
        setFinalAnswers(new Array(receivedQuestions.length).fill('**INCOMPLETE**'))
        setResults(new Array(receivedQuestions.length).fill(false))

        // Debug: log first image URLs, if any
        const firstWithImg = receivedQuestions.find(q => q.image_url)
        if (firstWithImg) {
          console.log('[Questions] example image_url raw:', firstWithImg.image_url)
          console.log(
            '[Questions] example image_url resolved:',
            resolveImageUrl(firstWithImg.image_url || '')
          )
        }
      } catch (error: any) {
        alert(`Failed to load quiz: ${error?.message ?? String(error)}`)
        console.error('Questions fetch failed:', error)
        console.log('Questions fetch debug ->', {
          classId,
          lessonName,
          api: process.env.EXPO_PUBLIC_API_BASE_URL,
        })
        router.dismiss()
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  /* Sets header content for the view: Custom back button and quiz progress dots */
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button icon="backspace-outline" onPress={handleBackButton} style={{ left: -10 }}>
          Quit
        </Button>
      ),
      // Nonexistent button just to help with aligning the title
      headerRight: () => (
        <Button style={{ right: -10 }}>
          <Text> </Text>
        </Button>
      ),
      headerTitle: renderProgressDots,
    })
  })

  /* Navigation functions */
  /**
   * Returns user to the appropriate Lessons page.
   * If their quiz is incomplete, shows an extra confirmation to communicate that
   * their incomplete questions will be marked incorrect for their statistics.
   */
  const handleBackButton = () => {
    if (!quizComplete) {
      setExitDialog(true)
    } else {
      handleConfirmExit()
    }
  }

  /**
   * Sends the quiz results to the database to update knowledge graphs.
   * Dismisses the screen, taking users back to the Lessons screen.
   */
  const handleConfirmExit = async () => {
    try {
      if (!finalPushed) {
        // 1) aggregate this quiz
        // 1) aggregate this quiz
        const perTopic = summarizeTopicsForAttempt(questions, results) // [{topic, attempts, correct}, ...]

        // 2) send per-topic deltas to backend
        const base = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
        const { data: sessData } = await supabase.auth.getSession()
        const token = sessData?.session?.access_token ?? null
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

        for (const row of perTopic) {
          await fetch(`${base}/update-node-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              student_id: uid,
              class_id: Number(classId),
              topics: [row.topic],
              // send deltas so backend can aggregate
              attemptsDelta: row.attempts,
              correctDelta: row.correct,
            }),
          })
        }

        setFinalPushed(true)
      }
    } catch (e) {
      console.error('Final schedule push failed:', e)
    } finally {
      router.dismiss()
    }
  }

  /* Quiz functions */
  /**
   * Function to be passed into Question type components as a prop to keep track of
   * the student's current answer.
   * @param answer The student's current full answer as a string.
   */
  const handleSelectAnswer = (answer: string) => {
    setCurrentAnswer(answer)
  }

  /**
   * Checks the student's current answer for correctness and updates variables apropriately.
   * Additionally,
   */
  const handleSubmitAnswer = async () => {
    if (!currentAnswer) return

    let uidNow = uid

    const currentQuestion = questions[questionIndex]
    const isCorrect = currentAnswer === currentQuestion.answer
    const answeredAt = new Date().toISOString()

    try {
      const { error: insertErr } = await supabase.from('student_question_answers').insert({
        student_id: uidNow,
        class_id: Number(classId),
        lesson_id: currentQuestion.lesson_id || null,
        question_id: currentQuestion.question_id,
        is_correct: isCorrect,
        answered_at: answeredAt,
        selected_answer: currentAnswer,
        raw_response: { selected: currentAnswer },
      })
      if (insertErr) {
        console.error('Failed to record student answer:', insertErr)
      }
    } catch (e) {
      console.error('Error recording student answer:', e)
    }

    setFinalAnswers(old => old.with(questionIndex, currentAnswer))
    setResults(old => old.with(questionIndex, isCorrect))
    setFeedback(true)
  }

  /**
   * Progresses the quiz after the student is done viewing their feedback.
   */
  const handleNextQuestion = () => {
    setQuestionIndex(questionIndex + 1)
    if (questions && questionIndex < questions.length - 1) {
      setCurrentAnswer('')
      setFeedback(false)
    } else {
      setComplete(true)
    }
  }

  /* Rendering functions */
  /**
   * For use in the header.
   * Sets the highlighted dot for the current question and colors dots for previous
   *    questions based on correctness.
   */
  const renderProgressDots = () => {
    return (
      <ScrollView
        style={styles.dotsContainer}
        contentContainerStyle={styles.allDots}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      >
        {questions.map((_, index) => {
          const baseDotStyle: ViewStyle = {
            ...styles.dot,
            backgroundColor: theme.dark ? '#e0e0e0' : '#0e0e0e',
          }
          let finalDotStyle: ViewStyle = { ...baseDotStyle }

          if (index === questionIndex) {
            finalDotStyle = { ...finalDotStyle, ...styles.currentDot }
          } else if (index < questionIndex) {
            finalDotStyle = {
              ...finalDotStyle,
              backgroundColor: results[index] ? '#4caf50' : '#f44336',
            }
          }

          return <View key={index} style={finalDotStyle} />
        })}
      </ScrollView>
    )
  }

  /**
   * Renders a single question using memoized data for a particular question type.
   * The data MUST be memoized otherwise it messes with rendering.
   *
   * @param memoizedQuestion Question data from useMemo
   * @returns One of the Question components
   */
  const renderQuestion = (memoizedQuestion: MultipleChoiceData | RearrangeData) => {
    const rawImg =
      currentQuestion && (currentQuestion as any).image_url
        ? String((currentQuestion as any).image_url)
        : ''

    const imgUrl = resolveImageUrl(rawImg)

    const imageNode = !!imgUrl ? (
      <Surface style={styles.imagePromptSurface} elevation={2}>
        <Icon source="image" size={48} color={theme.colors.primary} />
        <Text variant="titleMedium" style={{ marginTop: 12, marginBottom: 4, fontWeight: 'bold' }}>
          This question has an image
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 16, textAlign: 'center', color: '#666' }}>
          Please open the image to view it before answering
        </Text>
        <Button
          mode="contained"
          icon="open-in-new"
          onPress={() => Linking.openURL(imgUrl).catch(() => {})}
          contentStyle={{ paddingVertical: 12, paddingHorizontal: 24 }}
        >
          Open Image in Browser
        </Button>
      </Surface>
    ) : null

    switch (memoizedQuestion.question_type) {
      case 'multiple-choice':
        return (
          <View>
            {imageNode}
            <MultipleChoiceQuestion
              question={memoizedQuestion}
              selectedAnswer={currentAnswer}
              showFeedback={showFeedback}
              onAnswerSelect={handleSelectAnswer}
            />
          </View>
        )
      case 'rearrange':
        return (
          <View>
            {imageNode}
            <RearrangeQuestion
              question={memoizedQuestion}
              showFeedback={showFeedback}
              onAnswerSelect={handleSelectAnswer}
            />
          </View>
        )
    }
  }

  /**
   * Renders a full results screen for when the quiz is marked complete.
   * Isolated into a function to calculate certain data points beforehand.
   */
  const renderFinalResults = () => {
    const totalCorrect = results.filter(mark => mark).length
    const allTopics = Array.from(new Set(questions.flatMap(question => question.topics || [])))

    return (
      <Surface style={styles.resultContainer}>
        <Text variant="headlineMedium" style={styles.resultTitle}>
          Quiz Complete!
        </Text>
        <Text variant="titleLarge">
          Score: {totalCorrect} / {questions.length}
        </Text>

        <Button
          mode="outlined"
          onPress={() => setQuizTopics(!showQuizTopics)}
          style={styles.topicsButton}
        >
          {showQuizTopics ? 'Hide Topics' : 'Show Topics Covered'}
        </Button>

        {/**
         * @TODO Expand this collapsible widget into a more complete overview.
         * - Utilize finalAnswers to quickly show the student answer and solution for each question.
         * - Indicate which questions were answered correctly.
         * - Use individual question data to display which questions covered which topics.
         */}
        {showQuizTopics && (
          <View style={styles.topicsContainer}>
            <Text variant="titleMedium" style={styles.topicsHeader}>
              Topics Covered:
            </Text>
            <View style={styles.topicsList}>
              {allTopics.map((topic, index) => (
                <View key={index} style={styles.topicRow}>
                  <Icon source="checkbox-blank-circle" size={8} color="#666" />
                  <Text style={styles.topicItem}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Surface>
    )
  }
  // console.log('Render state:', { uid, authReady, loading })

  /* Actual rendered components start here */
  if (loading) {
    return (
      <View style={{ ...styles.container, marginTop: '50%', alignItems: 'center' }}>
        <Text variant="titleLarge">Loading questions...</Text>
        <ActivityIndicator size={'large'} />
      </View>
    )
  } else if (quizComplete) {
    return (
      <View style={styles.container}>
        {renderFinalResults()}
        <Button onPress={handleConfirmExit} icon="arrow-left">
          Back to Lessons
        </Button>
      </View>
    )
  } else {
    return (
      <View style={styles.container}>
        {/* Actual question rendering */}
        {memoizedQuestion && renderQuestion(memoizedQuestion)}
        {!showFeedback ? (
          <Button
            mode="contained"
            onPress={handleSubmitAnswer}
            disabled={!currentAnswer}
            style={styles.submitButton}
          >
            Submit Answer
          </Button>
        ) : (
          <Button mode="contained" onPress={handleNextQuestion} style={styles.submitButton}>
            {questionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}

        {/* Modal for giving up */}
        <Portal>
          <Dialog visible={showExitDialog} onDismiss={() => setExitDialog(false)}>
            <Dialog.Title>Exit Lesson?</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
                Are you sure you want to exit?
              </Text>
              {/* <Text variant="bodyLarge" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                Incomplete questions will be marked as incorrect!
              </Text> */}
            </Dialog.Content>
            <Dialog.Actions style={{ justifyContent: 'space-between' }}>
              <Button
                mode="contained"
                onPress={() => setExitDialog(false)}
                contentStyle={styles.giveUpButton}
              >
                Stay
              </Button>
              <Button
                icon="alert"
                mode="contained"
                onPress={handleConfirmExit}
                style={{ backgroundColor: theme.colors.error }}
                contentStyle={styles.giveUpButton}
                labelStyle={{ color: theme.colors.onError }}
              >
                Exit
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  // Layout containers
  container: {
    flex: 1,
  },
  resultContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  topicsContainer: {
    marginTop: 16,
    width: '100%',
  },

  // Progress dots
  dotsContainer: {
    padding: 16,
  },
  allDots: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196f3',
  },

  // Topics section
  topicsHeader: {
    marginBottom: 8,
  },
  topicsList: {
    marginTop: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  topicItem: {
    fontSize: 16,
    color: '#666',
  },

  // Buttons
  submitButton: {
    margin: 16,
  },
  topicsButton: {
    marginTop: 16,
  },
  giveUpButton: {
    paddingHorizontal: 5,
  },

  // Text elements
  resultTitle: {
    marginBottom: 16,
  },
  questionImage: {
    width: '100%',
    height: 180,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },

  imagePromptSurface: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})

export default Questions
