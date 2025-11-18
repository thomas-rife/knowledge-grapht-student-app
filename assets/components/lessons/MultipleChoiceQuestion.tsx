import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Surface, RadioButton } from 'react-native-paper'
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
  return (
    <Surface style={styles.questionContainer}>
      <Text variant="titleMedium" style={styles.prompt}>
        {question.prompt}
      </Text>

      {question.snippet && (
        <Surface style={styles.snippetContainer}>
          <Text style={styles.snippet}>{question.snippet}</Text>
        </Surface>
      )}

      <RadioButton.Group onValueChange={onAnswerSelect} value={selectedAnswer}>
        {question.answer_options.map((option, index) => (
          <View
            key={index}
            style={[
              styles.optionContainer,
              showFeedback && option === question.answer && styles.correctOption,
              showFeedback &&
                option === selectedAnswer &&
                option !== question.answer &&
                styles.incorrectOption,
            ]}
          >
            <RadioButton.Item label={option} value={option} disabled={showFeedback} />
          </View>
        ))}
      </RadioButton.Group>
    </Surface>
  )
}

const styles = StyleSheet.create({
  questionContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    // backgroundColor: '#ffffff',
  },
  prompt: {
    marginBottom: 16,
  },
  snippetContainer: {
    // backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  snippet: {
    fontFamily: 'monospace',
  },
  optionContainer: {
    marginBottom: 8,
    borderRadius: 4,
  },
  correctOption: {
    backgroundColor: '#4caf50',
  },
  incorrectOption: {
    backgroundColor: '#f44336',
  },
})

export default MultipleChoiceQuestion
