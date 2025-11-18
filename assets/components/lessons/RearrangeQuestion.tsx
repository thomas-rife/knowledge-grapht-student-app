import React, { useState, useEffect, useCallback, Fragment } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Surface, Chip, Card, Icon } from 'react-native-paper'
import { RearrangeData } from './Questions'

interface RearrangeQuestionProps {
  question: RearrangeData
  showFeedback: boolean
  onAnswerSelect: (answer: string) => void
}

type AnswerToken = {
  id: number
  blank: boolean
  content: string
}

const blankBase = { id: -1, blank: true, content: '__?__' }

const RearrangeQuestion = ({ question, showFeedback, onAnswerSelect }: RearrangeQuestionProps) => {
  const [availableTokens, setAvailableTokens] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState<(string | AnswerToken)[]>([])

  const { prompt, snippet, answer, answer_options } = question

  // Reset state when question changes
  useEffect(() => {
    try {
      if (!answer_options) {
        console.error('Invalid question structure:', JSON.stringify(question))
        return
      }

      setAvailableTokens(answer_options.tokens)

      let answerFormat = []

      for (let i = 0; i < answer_options.problem.length; i++) {
        answerFormat.push(answer_options.problem[i] || { ...blankBase, id: i })
      }

      setCurrentAnswer(answerFormat)
    } catch (error) {
      console.error('Error initializing state:', error)
    }
  }, [answer_options])

  const getAnswerString = (tokenArray: (string | AnswerToken)[]) => {
    let finalAnswer = ''

    for (const token of tokenArray) {
      if (typeof token === 'string') {
        finalAnswer += token
      } else if (!token.blank) {
        finalAnswer += token.content
      } else {
        return ''
      }
    }

    return finalAnswer
  }

  const handleTokenPress = useCallback(
    (fromAvailable: boolean, index: number) => {
      if (showFeedback) return

      let newCurrentAnswer = [...currentAnswer]

      if (fromAvailable) {
        const blankIndex = currentAnswer.findIndex(
          element => typeof element !== 'string' && element.blank
        )

        if (blankIndex < 0) return

        const insertingToken = availableTokens[index]

        newCurrentAnswer[blankIndex] = {
          id: blankIndex,
          blank: false,
          content: insertingToken,
        }

        setCurrentAnswer(newCurrentAnswer)
        setAvailableTokens(prev => prev.filter(t => t !== insertingToken))
      } else {
        const removingToken = currentAnswer[index]

        if (typeof removingToken === 'string') return

        newCurrentAnswer[index] = { ...blankBase, id: index }

        setCurrentAnswer(newCurrentAnswer)
        setAvailableTokens([...availableTokens, removingToken.content])
      }

      onAnswerSelect(getAnswerString(newCurrentAnswer))
    },
    [availableTokens, currentAnswer, showFeedback, onAnswerSelect]
  )

  const renderAnswerToken = (token: string | AnswerToken, index: number) => {
    if (typeof token === 'string') {
      // Handle multiline text by splitting on newlines
      if (token.includes('\n')) {
        const lines = token.split('\n')
        return lines.map((line, lineIndex) => (
          /**
           * React.Fragment is basically a <div>. Unlike <View> it can't be styled and doesn't
           * render anything at all, allowing it to be used as a pure wrapper element.
           *
           * Typically, you'd use the <> syntax instead, but we need to use Fragment here because
           * map() requires keys in its rendered elements, which <> does not support.
           */
          <Fragment key={`text-${index}-${lineIndex}`}>
            <Text style={styles.inlineText}>
              {line.replace('\t', '↳')}
              {lineIndex < lines.length - 1 && <Text style={{ opacity: 0.5 }}> ¶</Text>}
            </Text>
            {lineIndex < lines.length - 1 && <View style={styles.lineBreak} />}
          </Fragment>
        ))
      }

      return (
        <Text style={styles.inlineText} key={`text-${index}`}>
          {token.replace('\t', '↳')}
        </Text>
      )
    } else if (token.blank) {
      return (
        <Chip key={`blank-${index}`}>
          <Icon source="help-network" size={styles.problemText.fontSize} />
        </Chip>
      )
    } else {
      return (
        <Chip key={`answer-${token.content}`} onPress={() => handleTokenPress(false, token.id)}>
          {token.content}
        </Chip>
      )
    }
  }

  const answerCorrect = getAnswerString(currentAnswer) === answer

  return (
    <Card style={styles.questionContainer}>
      <Card.Title title={prompt} style={styles.prompt} />
      <Card.Content>
        {snippet && (
          <Surface style={styles.snippetContainer} elevation={2}>
            <Text style={styles.snippet}>{snippet}</Text>
          </Surface>
        )}

        <Surface style={styles.problemContainer} elevation={2}>
          <View style={styles.problemView}>
            {currentAnswer.map((token, index) => renderAnswerToken(token, index))}
          </View>
        </Surface>

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            <Text style={answerCorrect ? styles.correct : styles.incorrect}>
              {answerCorrect ? 'Correct!' : 'Incorrect. Expected: ' + answer}
            </Text>
          </View>
        )}
      </Card.Content>

      <Card.Actions>
        {availableTokens && availableTokens.length > 0 ? (
          <View style={styles.tokensContainer}>
            {availableTokens.map((token, index) => (
              <Chip
                key={`avail-${token}-${index}`}
                onPress={() => handleTokenPress(true, index)}
                disabled={showFeedback}
              >
                {token}
              </Chip>
            ))}
          </View>
        ) : (
          <Text>No tokens available</Text>
        )}
      </Card.Actions>
    </Card>
  )
}

const styles = StyleSheet.create({
  questionContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  prompt: {
    marginBottom: 16,
  },
  snippetContainer: {
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  snippet: {
    fontFamily: 'monospace',
  },
  problemContainer: {
    padding: 16,
    borderRadius: 4,
  },
  problemView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  problemText: {
    fontFamily: 'monospace',
    fontSize: 16,
  },
  inlineText: {
    fontFamily: 'monospace',
    fontSize: 16,
    alignSelf: 'center',
  },
  lineBreak: {
    width: '100%',
    height: 0,
  },
  tokensContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  feedbackContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 4,
    // backgroundColor: '#ffffff',
  },
  correct: {
    backgroundColor: '#4caf50',
  },
  incorrect: {
    backgroundColor: '#f44336',
  },
})

export default RearrangeQuestion
