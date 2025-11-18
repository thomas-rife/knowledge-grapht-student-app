import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Portal, Dialog, Text, Button, useTheme, TextInput } from 'react-native-paper'

interface OtpInputModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (otp: string) => void
}

const InputCodeModal = ({ visible, onClose, onSubmit }: OtpInputModalProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<HTMLInputElement[]>([])
  const theme = useTheme()
  const [enrolling, setEnrolling] = useState<boolean>(false)

  const isOtpComplete = otp.every(digit => digit !== '')

  /**
   * Resets the OTP and button loader state every time the modal opens, wiping the last code.
   */
  useEffect(() => {
    if (visible) {
      setEnrolling(false)
      setOtp(['', '', '', '', '', ''])

      /* Focus on the first input when modal opens
      Timeout needed to ensure modal is mounted before selecting text box
      */
      setTimeout(() => {
        inputRefs.current[0].focus()
      }, 100)
    }
  }, [visible])

  /**
   * Helper to transform raw user input and manage actual OTP in state.
   *
   * Checks for alphanumeric characters, ensures letters come in as uppercase, and moves the cursor
   * to the next text box if everything goes well.
   *
   * @param value Value just typed into TextInput box
   * @param index Identifies which OTP TextInput called this
   */
  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    // TextInput's autoCapitalize prop doesn't work here, so we do it ourselves
    newOtp[index] = value.toUpperCase()
    setOtp(newOtp)

    // Auto-focus to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  /**
   * Logic to make sure that pressing backspace in an empty OTP TextInput sends you to the
   * previous TextInput (if it exists).
   *
   * @param e React Native event, specifically looking for a backspace
   * @param index Identifies which OTP TextInput called this
   */
  const onBackspacePress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  /**
   * Sends the OTP back up to classes.tsx for processing.
   * Also ensures that modal parts can't be pressed while attempting to enroll, just in case.
   */
  const handleSubmit = () => {
    setEnrolling(true)
    onSubmit(otp.join(''))
    setEnrolling(false)
  }

  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Extra View wrapper is necessary, do not remove:
        https://medium.com/@nickopops/keyboardavoidingview-not-working-properly-c413c0a200d4 */}
        <View style={{ flex: 1 }}>
          <Dialog visible={visible} dismissable={false} onDismiss={onClose} style={styles.dialog}>
            <Dialog.Title>Enter Class Join Code</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {`Your professor will give you a 6-digit code.\nEnter it here.`}
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((character, index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpInputSurface,
                      { borderColor: character ? theme.colors.primary : theme.colors.outline },
                    ]}
                  >
                    {/* Check link below for explanation on most of these options: Not all of them
                        are in the React Native Paper docs.

                        https://reactnative.dev/docs/textinput */}
                    <TextInput
                      /* It looks complicated, but basically the arrow function output is
                      HTMLInputElement: same as the objects inside the inputRefs array.
                      @ts-ignore */
                      ref={ref => (inputRefs.current[index] = ref)}
                      onChangeText={value => handleOtpChange(value, index)}
                      onKeyPress={e => onBackspacePress(e, index)}
                      value={character}
                      style={styles.otpInputBox}
                      textAlign="center" // Don't set textAlign in style
                      selectTextOnFocus
                      maxLength={1}
                      autoCorrect={false}
                      disabled={enrolling}
                    />
                  </View>
                ))}
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={onClose} mode="text" disabled={enrolling}>
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                mode="contained"
                loading={enrolling}
                disabled={!isOtpComplete || enrolling}
              >
                Enroll
              </Button>
            </Dialog.Actions>
          </Dialog>
        </View>
      </KeyboardAvoidingView>
    </Portal>
  )
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 12,
    justifyContent: 'flex-end',
    marginHorizontal: 20,
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInputSurface: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    elevation: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignContent: 'center',
  },
  otpInputBox: {
    fontSize: 20,
  },
})

export default InputCodeModal
