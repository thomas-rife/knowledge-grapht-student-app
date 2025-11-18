import React from 'react'
import { Stack } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { Themes } from '@/assets/Themes'
import { ThemeProvider } from '@react-navigation/native'

const RootLayout = () => {
  const theme = useColorScheme() === 'light' ? Themes.light : Themes.dark

  return (
    <PaperProvider theme={theme}>
      {/* @ts-ignore -- Necessary due to merged color themes*/}
      <ThemeProvider value={theme}>
        <SafeAreaProvider>
          <GestureHandlerRootView>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </PaperProvider>
  )
}

export default RootLayout
