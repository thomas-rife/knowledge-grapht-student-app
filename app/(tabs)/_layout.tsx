import React from 'react'
import { Stack } from 'expo-router'

const RootLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="(home)" options={{ title: 'Home' }} />
      <Stack.Screen name="[classId]" />
      <Stack.Screen name="questions" />
    </Stack>
  )
}

export default RootLayout
