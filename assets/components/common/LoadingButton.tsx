import React from 'react'
import { Button, type ButtonProps } from 'react-native-paper'
import LoadingIndicator from './LoadingIndicator'

export default function LoadingButton({
  loading = false,
  disabled,
  icon,
  accessibilityState,
  ...props
}: ButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      accessibilityState={{ ...accessibilityState, busy: loading }}
      icon={loading ? ({ color }) => <LoadingIndicator color={color} size="small" /> : icon}
    />
  )
}
