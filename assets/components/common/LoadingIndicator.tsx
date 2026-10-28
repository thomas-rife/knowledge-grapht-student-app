import React from 'react'
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native'
import { useTheme } from 'react-native-paper'

export default function LoadingIndicator({
  size = 'large',
  color,
  accessibilityLabel = 'Loading',
  ...props
}: ActivityIndicatorProps) {
  const theme = useTheme()

  return (
    <ActivityIndicator
      {...props}
      size={size}
      color={color ?? theme.colors.primary}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
    />
  )
}
