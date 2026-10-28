import React from 'react'
import { Stack } from 'expo-router'

const PracticeLayout = () => (
  <Stack>
    <Stack.Screen name="questions" options={{ title: 'Practice' }} />
  </Stack>
)

export default PracticeLayout
