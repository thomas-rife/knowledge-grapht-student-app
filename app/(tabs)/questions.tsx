import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Pressable,
  Alert,
} from 'react-native'
import { SvgUri } from 'react-native-svg'
import {
  Text,
  Surface,
  Button,
  useTheme,
  Icon,
  Chip,
  ProgressBar,
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
import { syncStudyReminders } from '@/services/notifications'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'
import QuizExitDialog from '@/assets/components/lessons/QuizExitDialog'
import { BlurTargetView } from 'expo-blur'

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
  const {
    classId,
    className,
    lessonName,
    review,
    topic,
    reviewQuizSize,
    quizMode,
    launchSource,
    recommendationSnapshotId,
  } = useLocalSearchParams()

  /* State variables - controls for visible components */
  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [quizComplete, setComplete] = useState<boolean>(false)
  const [showExitDialog, setExitDialog] = useState<boolean>(false)
  const [showFeedback, setFeedback] = useState<boolean>(false)
  const [showQuestionBreakdown, setShowQuestionBreakdown] = useState<boolean>(false)

  /* Quiz variables - handles data for quiz processing */
  const [questions, setQuestions] = useState<(Question & { image_url?: string | null })[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [submittedAnswers, setSubmittedAnswers] = useState<(string | null)[]>([])
  const [finalPushed, setFinalPushed] = useState(false)
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({})
  const allowNavigationRef = useRef(false)
  const submittedQuestionIndexRef = useRef<number | null>(null)
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null)

  const currentQuestion = questions[questionIndex]
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isExiting, setIsExiting] = useState<boolean>(false) // Prevent double-tap on exit
  const blurTarget = useRef<View | null>(null)

  const memoizedQuestion = useMemo<MultipleChoiceData | RearrangeData | null>(() => {
    if (!currentQuestion) return null

    switch (currentQuestion.question_type) {
      case 'multiple-choice': {
        const originalOptions = currentQuestion.answer_options as string[]
        const opts = [...originalOptions]

        // Fisher Yates shuffle so options appear in random order each time
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const temp = opts[i]
          opts[i] = opts[j]
          opts[j] = temp
        }

        return {
          ...currentQuestion,
          answer_options: opts,
          question_type: 'multiple-choice',
        }
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

    // console.log('Auth useEffect started')

    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      // console.log('getSession full response:', {
      //   session: data?.session,
      //   user: data?.session?.user,
      //   userId: data?.session?.user?.id,
      //   error: error,
      // })
      if (isMounted && data?.session?.user?.id) {
        setUid(data.session.user.id)
      } else if (isMounted) {
        console.warn('No session found in getSession')
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // console.log('Auth state change event:', event)
      // console.log('Auth state change session:', session)
      // console.log('Auth state change userId:', session?.user?.id)
      if (isMounted) {
        setUid(session?.user?.id ?? null)
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

        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const authHeader: Record<string, string> = {}
        if (session?.access_token) {
          authHeader.Authorization = `Bearer ${session.access_token}`
        }

        const requestedQuizMode =
          quizMode === 'daily_review' ||
          quizMode === 'topic_practice' ||
          quizMode === 'lesson'
            ? quizMode
            : review === '1'
              ? 'topic_practice'
              : 'lesson'
        const requestedQuizSize = Number(reviewQuizSize)
        const lessonId = Number(lessonName)

        const resp = await fetch(`${base}/user/quiz-sessions/start`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...authHeader,
          },
          body: JSON.stringify({
            class_id: Number(cid),
            quiz_mode: requestedQuizMode,
            launch_source:
              typeof launchSource === 'string' && launchSource
                ? launchSource
                : requestedQuizMode === 'lesson'
                  ? 'lesson_screen'
                  : requestedQuizMode === 'daily_review'
                    ? 'today'
                    : 'graph_node',
            lesson_id: requestedQuizMode === 'lesson' && Number.isFinite(lessonId) ? lessonId : null,
            topic: typeof topic === 'string' ? topic : null,
            recommendation_snapshot_id:
              typeof recommendationSnapshotId === 'string' ? recommendationSnapshotId : null,
            num_questions:
              Number.isFinite(requestedQuizSize) && requestedQuizSize > 0
                ? requestedQuizSize
                : 10,
          }),
        })

        const parsed = await resp.json().catch(() => null)
        if (!resp.ok || !parsed) {
          throw new Error(parsed?.error || `Quiz could not be started (${resp.status})`)
        }
        if (!parsed.quiz_session_id) {
          throw new Error('Quiz session was not created.')
        }
        setQuizSessionId(String(parsed.quiz_session_id))

        // COMMON: Parse questions (works for both review and lesson quizzes)
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
        })) as (Question & { image_url?: string | null })[]

        if (receivedQuestions.length < 1) {
          throw new Error('This quiz has no questions.')
        }

        setQuestions(receivedQuestions)
        setResults(new Array(receivedQuestions.length).fill(false))
        setSubmittedAnswers(new Array(receivedQuestions.length).fill(null))
      } catch (error: any) {
        alert(`Failed to load quiz: ${error?.message ?? String(error)}`)
        console.error('Questions fetch failed:', error)
        allowNavigationRef.current = true
        router.dismiss()
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [
    classId,
    launchSource,
    lessonName,
    quizMode,
    recommendationSnapshotId,
    review,
    reviewQuizSize,
    router,
    topic,
  ])

  /* Keep quiz controls readable and balanced in the native stack header. */
  useEffect(() => {
    const questionNumber = questions.length > 0 ? Math.min(questionIndex + 1, questions.length) : 0

    navigation.setOptions({
      headerBackVisible: false,
      headerTitle: quizComplete ? 'Results' : 'Practice',
      headerLeft: quizComplete
        ? () => null
        : () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quit quiz"
              hitSlop={10}
              onPress={() => setExitDialog(true)}
              style={({ pressed }) => [styles.headerQuit, pressed && styles.headerActionPressed]}
            >
              <Icon source="close" size={19} color={theme.colors.primary} />
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                Quit
              </Text>
            </Pressable>
          ),
      headerRight: quizComplete
        ? () => null
        : () => (
            <Text variant="labelLarge" style={styles.headerProgress}>
              {questions.length > 0 ? `${questionNumber} of ${questions.length}` : ''}
            </Text>
          ),
    })
  }, [navigation, questionIndex, questions.length, quizComplete, theme.colors.primary])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (allowNavigationRef.current) return

      event.preventDefault()
      setExitDialog(true)
    })

    return unsubscribe
  }, [navigation])

  /**
   * Sends the quiz results to the database to update knowledge graphs.
   * Dismisses the screen, returning users to the surface that launched the quiz.
   */
  const handleConfirmExit = async () => {
    if (isExiting || isSubmitting) return
    setIsExiting(true)
    let snapshotWarning: string | null = null

    try {
      if (!finalPushed) {
        const base = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
        const { data: sessData } = await supabase.auth.getSession()
        const token = sessData?.session?.access_token ?? null
        const authHeader: Record<string, string> = {}
        if (token) {
          authHeader.Authorization = `Bearer ${token}`
        }

        if (!quizSessionId) {
          throw new Error('The quiz session ID is missing.')
        }

        if (!quizComplete) {
          const resp = await fetch(`${base}/user/quiz-sessions/${quizSessionId}/abandon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
          })
          const payload = await resp.json().catch(() => null)
          if (!resp.ok) {
            throw new Error(payload?.error || `Quiz could not be abandoned (${resp.status})`)
          }
        } else {
          const perTopic = summarizeTopicsForAttempt(questions, results)
          for (const row of perTopic) {
            const progressResp = await fetch(`${base}/user/update-node-progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeader },
              body: JSON.stringify({
                class_id: Number(classId),
                topics: [row.topic],
                attemptsDelta: row.attempts,
                correctDelta: row.correct,
              }),
            })
            if (!progressResp.ok) {
              throw new Error(`Topic progress could not be updated (${progressResp.status})`)
            }
          }

          const totalCorrect = results.filter(Boolean).length
          const totalQuestions = questions.length
          const timezone = (() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            } catch {
              return 'UTC'
            }
          })()

          const resp = await fetch(`${base}/user/quiz-sessions/${quizSessionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              answered_count: totalQuestions,
              num_correct: totalCorrect,
              timezone,
            }),
          })

          const payload = await resp.json().catch(() => null)
          if (!resp.ok) {
            throw new Error(payload?.error || `Quiz could not be completed (${resp.status})`)
          }

          if (!payload?.review_snapshot_saved) {
            snapshotWarning =
              typeof payload?.review_snapshot_error === 'string' && payload.review_snapshot_error
                ? payload.review_snapshot_error
                : 'The recommendation service did not create a snapshot.'
            console.warn('Quiz completed without a recommendation snapshot:', snapshotWarning)
          }

          if (payload?.streak) {
            void syncStudyReminders({
              classId: String(classId),
              className: typeof className === 'string' ? className : null,
              currentStreak: payload.streak.current_streak,
              studiedToday: payload.streak.studied_today,
              nextReviewDueOn: payload.streak.next_review_due_on,
              cadenceDays: payload.streak.cadence_days,
            })
          }
        }

        setFinalPushed(true)
      }
    } catch (e) {
      setIsExiting(false)
      console.error('Quiz exit failed:', e)
      alert(e instanceof Error ? e.message : 'Quiz progress could not be saved. Please try again.')
      return
    }

    setIsExiting(false)
    setExitDialog(false)
    allowNavigationRef.current = true
    const fallbackDestination =
      launchSource === 'graph_node'
        ? {
            pathname: '/[classId]/graph' as const,
            params: {
              classId: String(classId),
              className: typeof className === 'string' ? className : '',
            },
          }
        : quizMode === 'lesson'
          ? {
              pathname: '/[classId]/lessons' as const,
              params: {
                classId: String(classId),
                className: typeof className === 'string' ? className : '',
              },
            }
          : {
              pathname: '/[classId]/today' as const,
              params: {
                classId: String(classId),
                className: typeof className === 'string' ? className : '',
              },
            }

    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(fallbackDestination)
    }

    if (snapshotWarning) {
      Alert.alert(
        'Review recommendation not updated',
        `Your quiz results and streak were saved, but Today could not refresh its recommendation. ${snapshotWarning}`
      )
    }
  }

  const resultReturnLabel =
    launchSource === 'graph_node'
      ? 'Back to Graph'
      : quizMode === 'lesson'
        ? 'Back to Lessons'
        : 'Back to Today'

  /* Quiz functions */
  /**
   * Function to be passed into Question type components as a prop to keep track of
   * the student's current answer.
   * @param answer The student's current full answer as a string.
   */
  const handleSelectAnswer = (answer: string) => {
    if (submittedQuestionIndexRef.current === questionIndex) return
    setCurrentAnswer(answer)
  }

  /**
   * Checks the student's current answer for correctness and updates variables apropriately.
   * Additionally,
   */
  const handleSubmitAnswer = async () => {
    if (!currentAnswer || submittedQuestionIndexRef.current === questionIndex) return
    if (!uid || !quizSessionId) {
      Alert.alert(
        'Quiz connection unavailable',
        'The quiz is not ready to save answers yet. Check your connection and try again.'
      )
      return
    }

    // Refs update synchronously, so a second tap is blocked even before React
    // re-renders the disabled/loading state on the button.
    submittedQuestionIndexRef.current = questionIndex
    setIsSubmitting(true)

    const currentQuestion = questions[questionIndex]
    const studentId = uid
    const sessionId = quizSessionId
    const submittedAnswer = currentAnswer
    const isCorrect = submittedAnswer === currentQuestion.answer
    const answeredAt = new Date().toISOString()
    const reconcilePersistedAnswer = async () => {
      const { data: existingAnswer, error: reconcileError } = await supabase
        .from('student_question_answers')
        .select('answer_id, selected_answer')
        .eq('quiz_session_id', sessionId)
        .eq('question_id', currentQuestion.question_id)
        .eq('student_id', studentId)
        .order('answered_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return !reconcileError && existingAnswer?.selected_answer === submittedAnswer
    }
    const applySavedAnswer = () => {
      setSubmittedAnswers(old => old.with(questionIndex, submittedAnswer))
      setResults(old => old.with(questionIndex, isCorrect))
      setFeedback(true)
    }

    try {
      const answerPayload = {
        student_id: studentId,
        class_id: Number(classId),
        lesson_id: currentQuestion.lesson_id || null,
        question_id: currentQuestion.question_id,
        is_correct: isCorrect,
        answered_at: answeredAt,
        selected_answer: submittedAnswer,
        raw_response: { selected: submittedAnswer },
        quiz_session_id: sessionId,
      }
      const { error: insertErr } = await supabase
        .from('student_question_answers')
        .insert(answerPayload)

      if (insertErr) {
        // A connection can fail after the database accepted the write. Reconcile
        // against this session/question before asking the student to retry.
        const writeWasRecovered = await reconcilePersistedAnswer()
        if (!writeWasRecovered) {
          throw new Error(insertErr.message || 'The answer could not be saved.')
        }
      }

      applySavedAnswer()
    } catch (error) {
      // Supabase normally returns an error object, but a lower-level fetch can
      // throw. Reconcile that ambiguous case before presenting a retry.
      const writeWasRecovered = await reconcilePersistedAnswer().catch(() => false)
      if (writeWasRecovered) {
        applySavedAnswer()
        return
      }

      submittedQuestionIndexRef.current = null
      console.error('Error recording student answer:', error)
      Alert.alert(
        'Answer not saved',
        'Check your connection and try again. Your quiz is still open and this question has not been counted.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Progresses the quiz after the student is done viewing their feedback.
   */
  const handleNextQuestion = () => {
    submittedQuestionIndexRef.current = null
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
    const isSvg = /\.svg(\?.*)?$/i.test(imgUrl)
    const failed = !!imageFailed[questionIndex]

    const imageNode = !!imgUrl ? (
      <Surface
        style={[styles.imageInlineSurface, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '600' }}>
          Image
        </Text>

        {!failed ? (
          isSvg ? (
            <Pressable
              style={styles.inlineImageWrap}
              onPress={() => Linking.openURL(imgUrl).catch(() => {})}
            >
              <SvgUri
                uri={imgUrl}
                width="100%"
                height={200}
                onError={() => setImageFailed(prev => ({ ...prev, [questionIndex]: true }))}
              />
            </Pressable>
          ) : (
            <Pressable
              style={styles.inlineImagePressable}
              onPress={() => Linking.openURL(imgUrl).catch(() => {})}
            >
              <Image
                source={{ uri: imgUrl }}
                style={styles.inlineImage}
                resizeMode="contain"
                onError={() => setImageFailed(prev => ({ ...prev, [questionIndex]: true }))}
              />
            </Pressable>
          )
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text
              variant="bodyMedium"
              style={{ marginBottom: 12, textAlign: 'center', color: '#666' }}
            >
              Could not load the image inline.
            </Text>
            <Button
              mode="outlined"
              icon="open-in-new"
              onPress={() => Linking.openURL(imgUrl).catch(() => {})}
            >
              Open Image in Browser
            </Button>
          </View>
        )}
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
    const totalIncorrect = Math.max(questions.length - totalCorrect, 0)
    const accuracy = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0
    const topicStatsMap = new Map<string, { attempts: number; correct: number }>()

    questions.forEach((question, index) => {
      const topics = Array.isArray(question.topics)
        ? question.topics.map(value => String(value).trim()).filter(Boolean)
        : []
      topics.forEach(topicName => {
        const stats = topicStatsMap.get(topicName) ?? { attempts: 0, correct: 0 }
        stats.attempts += 1
        if (results[index]) stats.correct += 1
        topicStatsMap.set(topicName, stats)
      })
    })

    const topicStats = Array.from(topicStatsMap.entries())
      .map(([topicName, stats]) => ({ topicName, ...stats }))
      .sort((a, b) => b.attempts - a.attempts || a.topicName.localeCompare(b.topicName))

    return (
      <View style={styles.resultsContainer}>
        <Text variant="headlineMedium" style={styles.resultTitle}>
          Quiz Complete!
        </Text>
        <Text variant="titleLarge" style={styles.resultScore}>
          Score: {totalCorrect} / {questions.length}
        </Text>

        <View style={styles.resultsStatsRow}>
          <Surface style={styles.resultStat} elevation={1}>
            <Text variant="headlineSmall" style={styles.resultStatValue}>
              {accuracy}%
            </Text>
            <Text variant="labelMedium">Accuracy</Text>
          </Surface>
          <Surface style={styles.resultStat} elevation={1}>
            <Text variant="headlineSmall" style={styles.correctStatValue}>
              {totalCorrect}
            </Text>
            <Text variant="labelMedium">Correct</Text>
          </Surface>
          <Surface style={styles.resultStat} elevation={1}>
            <Text variant="headlineSmall" style={styles.incorrectStatValue}>
              {totalIncorrect}
            </Text>
            <Text variant="labelMedium">Missed</Text>
          </Surface>
        </View>

        <Surface style={styles.analyticsSection} elevation={1}>
          <Text variant="titleLarge" style={styles.analyticsTitle}>
            Topic performance
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Questions count toward every topic they were tagged with.
          </Text>

          {topicStats.length > 0 ? (
            <View style={styles.topicMetrics}>
              {topicStats.map(topicStat => {
                const topicAccuracy = topicStat.attempts
                  ? topicStat.correct / topicStat.attempts
                  : 0
                return (
                  <View key={topicStat.topicName} style={styles.topicMetric}>
                    <View style={styles.topicMetricHeader}>
                      <Text variant="titleSmall" style={styles.topicMetricName}>
                        {topicStat.topicName}
                      </Text>
                      <Text variant="labelLarge">
                        {topicStat.correct} / {topicStat.attempts}
                      </Text>
                    </View>
                    <ProgressBar progress={topicAccuracy} style={styles.topicProgress} />
                  </View>
                )
              })}
            </View>
          ) : (
            <Text variant="bodyMedium" style={styles.emptyTopicsText}>
              No topic tags were included with these questions.
            </Text>
          )}
        </Surface>

        <Button
          mode="contained"
          onPress={handleConfirmExit}
          icon="arrow-left"
          disabled={isExiting}
          style={styles.resultsExitButton}
          contentStyle={styles.quizButtonContent}
        >
          {isExiting
            ? 'Saving results…'
            : resultReturnLabel}
        </Button>

        <Button
          mode="outlined"
          icon={showQuestionBreakdown ? 'chevron-up' : 'chevron-down'}
          onPress={() => setShowQuestionBreakdown(value => !value)}
          style={styles.breakdownButton}
          contentStyle={styles.quizButtonContent}
        >
          {showQuestionBreakdown ? 'Hide question breakdown' : 'Review each question'}
        </Button>

        {showQuestionBreakdown && (
          <View style={styles.questionBreakdown}>
            {questions.map((question, index) => {
              const wasCorrect = Boolean(results[index])
              const questionTopics = Array.isArray(question.topics)
                ? question.topics.map(value => String(value).trim()).filter(Boolean)
                : []
              const studentAnswer = submittedAnswers[index] || 'No answer recorded'

              return (
                <Surface key={question.question_id} style={styles.questionResultCard} elevation={1}>
                  <View style={styles.questionResultHeader}>
                    <Text variant="labelLarge">Question {index + 1}</Text>
                    <Chip
                      compact
                      icon={wasCorrect ? 'check-circle' : 'close-circle'}
                      style={{
                        backgroundColor: wasCorrect
                          ? theme.dark
                            ? '#1B5E20'
                            : '#D4F8D4'
                          : theme.dark
                            ? '#8E1B1B'
                            : '#F8D4D4',
                      }}
                    >
                      {wasCorrect ? 'Correct' : 'Missed'}
                    </Chip>
                  </View>

                  <Text variant="titleMedium" style={styles.questionResultPrompt}>
                    {question.prompt}
                  </Text>

                  <View style={styles.questionTopicChips}>
                    {questionTopics.length > 0 ? (
                      questionTopics.map(topicName => (
                        <Chip key={topicName} compact icon="tag-outline">
                          {topicName}
                        </Chip>
                      ))
                    ) : (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        No topic tags
                      </Text>
                    )}
                  </View>

                  <View style={styles.answerReview}>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      Your answer
                    </Text>
                    <Text variant="bodyMedium">{studentAnswer}</Text>
                    {!wasCorrect && (
                      <>
                        <Text
                          variant="labelMedium"
                          style={[
                            styles.correctAnswerLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Correct answer
                        </Text>
                        <Text variant="bodyMedium">{question.answer}</Text>
                      </>
                    )}
                  </View>
                </Surface>
              )
            })}
          </View>
        )}
      </View>
    )
  }
  /* Actual rendered components start here */
  let content: React.ReactNode
  if (loading) {
    content = (
      <View style={{ ...styles.container, marginTop: '50%', alignItems: 'center' }}>
        <Text variant="titleLarge">Loading questions...</Text>
        <LoadingIndicator />
      </View>
    )
  } else if (quizComplete) {
    content = (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.resultsScrollContent}
      >
        {renderFinalResults()}
      </ScrollView>
    )
  } else {
    content = (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.fullScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {memoizedQuestion && renderQuestion(memoizedQuestion)}

        {!showFeedback ? (
          <Button
            mode="contained"
            onPress={handleSubmitAnswer}
            disabled={!currentAnswer || isSubmitting}
            style={styles.submitButton}
            contentStyle={styles.quizButtonContent}
          >
            {isSubmitting ? 'Saving answer…' : 'Submit Answer'}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleNextQuestion}
            style={styles.submitButton}
            contentStyle={styles.quizButtonContent}
          >
            {questionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}

      </ScrollView>
    )
  }

  return (
    <>
      <BlurTargetView ref={blurTarget} style={styles.container}>
        {content}
      </BlurTargetView>
      <QuizExitDialog
        visible={showExitDialog}
        quizComplete={quizComplete}
        isExiting={isExiting}
        isSubmitting={isSubmitting}
        blurTarget={blurTarget}
        onDismiss={() => setExitDialog(false)}
        onConfirm={handleConfirmExit}
      />
    </>
  )
}

const styles = StyleSheet.create({
  // Layout containers
  container: {
    flex: 1,
  },
  resultsScrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  resultsContainer: {
    width: '100%',
  },

  // Header
  headerQuit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  headerActionPressed: {
    opacity: 0.55,
  },
  headerProgress: {
    marginRight: 4,
    fontVariant: ['tabular-nums'],
  },

  // Results
  resultsStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
    width: '100%',
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resultStatValue: {
    fontWeight: '700',
  },
  correctStatValue: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  incorrectStatValue: {
    color: '#C62828',
    fontWeight: '700',
  },
  resultScore: {
    textAlign: 'center',
  },
  analyticsSection: {
    padding: 18,
    borderRadius: 16,
  },
  analyticsTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  topicMetrics: {
    gap: 16,
    marginTop: 18,
  },
  topicMetric: {
    gap: 7,
  },
  topicMetricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicMetricName: {
    flex: 1,
  },
  topicProgress: {
    height: 7,
    borderRadius: 4,
  },
  emptyTopicsText: {
    marginTop: 16,
  },
  breakdownButton: {
    marginTop: 16,
  },
  questionBreakdown: {
    gap: 12,
    marginTop: 12,
  },
  questionResultCard: {
    padding: 16,
    borderRadius: 14,
  },
  questionResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  questionResultPrompt: {
    marginTop: 14,
    lineHeight: 23,
  },
  questionTopicChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  answerReview: {
    gap: 4,
    marginTop: 16,
  },
  correctAnswerLabel: {
    marginTop: 10,
  },

  // Buttons
  submitButton: {
    margin: 16,
  },
  quizButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  resultsExitButton: {
    marginTop: 18,
  },

  // Text elements
  resultTitle: {
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '700',
  },
  questionImage: {
    width: '100%',
    height: 180,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 6,
  },

  imagePromptSurface: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  imageInlineSurface: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  inlineImageWrap: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inlineImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  inlineImagePressable: {
    width: '100%',
  },
  fullScrollContent: {
    paddingBottom: 32,
  },
})

export default Questions
