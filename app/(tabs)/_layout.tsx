import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { DynamicColorIOS, Platform } from 'react-native'
import { useTheme } from 'react-native-paper'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { Colors } from '@/assets/Colors'
import { supabase } from '@/supabaseClient'

const TabsLayout = () => {
  const router = useRouter()
  const theme = useTheme()
  const [authReady, setAuthReady] = useState(false)

  const tintColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ light: Colors.light.primary, dark: Colors.dark.primary })
      : theme.colors.primary

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (!data.session) {
        router.replace('/(auth)/login')
      }
      setAuthReady(true)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login')
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  if (!authReady) return null

  return (
    <NativeTabs tintColor={tintColor} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="classes" contentStyle={{ backgroundColor: theme.colors.background }}>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
          md="school"
        />
        <NativeTabs.Trigger.Label>Classes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile" contentStyle={{ backgroundColor: theme.colors.background }}>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

export default TabsLayout
