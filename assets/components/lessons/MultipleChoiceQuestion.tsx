import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Surface, RadioButton, useTheme } from 'react-native-paper'
import { MultipleChoiceData } from './Questions'

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceData
  selectedAnswer: string
  showFeedback: boolean
  onAnswerSelect: (answer: string) => void
}

const MultipleChoiceQuestion = ({
  question,
  selectedAnswer,
  showFeedback,
  onAnswerSelect,
}: MultipleChoiceQuestionProps) => {
  const theme = useTheme()

  const correctBg = theme.dark ? '#2E7D32' : '#D4F8D4' // darker green in dark mode
  const incorrectBg = theme.dark ? '#C62828' : '#F8D4D4' // darker red in dark mode

  return (
    <View style={styles.questionContainer}>
      <Surface
        style={[
          styles.promptContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={2}
      >
        <View style={styles.promptLabelRow}>
          <View style={[styles.promptAccent, { backgroundColor: theme.colors.primary }]} />
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Question
          </Text>
        </View>

        <Text variant="titleLarge" style={styles.prompt}>
          {question.prompt}
        </Text>

        {question.snippet && (
          <Surface style={styles.snippetContainer} elevation={0}>
            <Text style={styles.snippet}>{question.snippet}</Text>
          </Surface>
        )}
      </Surface>

      <Text variant="labelLarge" style={styles.answersLabel}>
        Choose an answer
      </Text>

      <RadioButton.Group onValueChange={onAnswerSelect} value={selectedAnswer}>
        {question.answer_options.map((option, index) => {
          const isCorrectAnswer = option === question.answer
          const isUserSelection = option === selectedAnswer
          const shouldDisable = showFeedback && !isCorrectAnswer

          return (
            <View
              key={index}
              style={[
                styles.optionContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
                !showFeedback &&
                  isUserSelection && {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  },
                showFeedback &&
                  isCorrectAnswer && {
                    backgroundColor: correctBg,
                    borderColor: theme.dark ? '#81C784' : '#2E7D32',
                    borderWidth: 2,
                  },
                showFeedback &&
                  isUserSelection &&
                  !isCorrectAnswer && {
                    backgroundColor: incorrectBg,
                    borderColor: theme.dark ? '#EF9A9A' : '#C62828',
                    borderWidth: 2,
                  },
              ]}
            >
              <RadioButton.Item label={option} value={option} disabled={shouldDisable} />
            </View>
          )
        })}
      </RadioButton.Group>
    </View>
  )
}

const styles = StyleSheet.create({
  questionContainer: {
    margin: 16,
  },
  promptContainer: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  promptLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  promptAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  prompt: {
    lineHeight: 29,
    fontWeight: '600',
  },
  snippetContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  snippet: {
    fontFamily: 'monospace',
  },
  answersLabel: {
    marginBottom: 10,
    marginLeft: 4,
  },
  optionContainer: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
})

export default MultipleChoiceQuestion
