import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'
import AppModal from '../common/AppModal'
import LoadingButton from '../common/LoadingButton'

interface QuizExitDialogProps {
  visible: boolean
  quizComplete: boolean
  isExiting: boolean
  isSubmitting: boolean
  blurTarget?: React.RefObject<View | null>
  onDismiss: () => void
  onConfirm: () => void
}

export default function QuizExitDialog({
  visible,
  quizComplete,
  isExiting,
  isSubmitting,
  blurTarget,
  onDismiss,
  onConfirm,
}: QuizExitDialogProps) {
  const theme = useTheme()

  return (
    <AppModal
      visible={visible}
      title={quizComplete ? 'Finish quiz?' : 'Exit practice?'}
      blurTarget={blurTarget}
      onDismiss={onDismiss}
      dismissable={!isExiting}
      footer={
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={onDismiss}
            disabled={isExiting}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {quizComplete ? 'View Results' : 'Keep Studying'}
          </Button>
          <LoadingButton
            mode="outlined"
            icon={quizComplete ? 'check' : 'exit-to-app'}
            onPress={onConfirm}
            disabled={isSubmitting || isExiting}
            loading={isExiting}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {isExiting ? 'Saving…' : quizComplete ? 'Finish' : 'Save & Exit'}
          </LoadingButton>
        </View>
      }
    >
      <View style={styles.message}>
        <Text
          variant="bodyMedium"
          style={[styles.messageText, { color: theme.colors.onSurfaceVariant }]}
        >
          {quizComplete
            ? 'Save your completed results and return to the course.'
            : 'Your submitted answers will be saved. This session will not count as complete or extend your streak.'}
        </Text>
        {isSubmitting && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Finishing your answer save before you can exit…
          </Text>
        )}
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  message: {
    padding: 20,
    gap: 12,
  },
  messageText: {
    lineHeight: 23,
  },
  actions: {
    gap: 12,
  },
  buttonContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
})
