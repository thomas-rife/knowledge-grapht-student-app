import React, { useEffect, useRef } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { ThemeProvider } from 'expo-router/react-navigation'
import { PaperProvider, Text } from 'react-native-paper'
import { Pressable, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { Themes } from '@/assets/Themes'
import {
  configureNotificationHandling,
  getStudyReminderClassId,
} from '@/services/notifications'

const RootLayout = () => {
  const theme = useColorScheme() === 'light' ? Themes.light : Themes.dark
  const router = useRouter()
  const lastHandledNotificationId = useRef<string | null>(null)

  useEffect(() => {
    configureNotificationHandling()

    const openReminder = (response: Notifications.NotificationResponse | null) => {
      const notificationId = response?.notification.request.identifier ?? null
      if (!notificationId || notificationId === lastHandledNotificationId.current) return
      const classId = getStudyReminderClassId(response)
      if (!classId) return

      lastHandledNotificationId.current = notificationId
      router.navigate({ pathname: '/[classId]/today', params: { classId } })
    }

    void Notifications.getLastNotificationResponseAsync().then(openReminder)
    const subscription = Notifications.addNotificationResponseReceivedListener(openReminder)
    return () => subscription.remove()
  }, [router])

  return (
    <PaperProvider theme={theme}>
      {/* @ts-ignore - Necessary due to merged color themes*/}
      <ThemeProvider value={theme}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />

              {/* non-tab stack screens */}
              <Stack.Screen
                name="[classId]"
                options={{
                  headerShown: true,
                  headerBackVisible: false,
                  gestureEnabled: false,
                  headerLeft: () => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Return to Classes"
                      hitSlop={10}
                      onPress={() => router.dismissTo('/(tabs)/classes')}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingHorizontal: 4,
                        opacity: pressed ? 0.55 : 1,
                      })}
                    >
                      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                        Classes
                      </Text>
                    </Pressable>
                  ),
                }}
              />
            </Stack>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </PaperProvider>
  )
}

export default RootLayout
