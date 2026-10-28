import React, { useEffect } from 'react'
import { useGlobalSearchParams, useNavigation } from 'expo-router'
import { DynamicColorIOS, Platform } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { Colors } from '@/assets/Colors'

const ClassTabs = () => {
  const navigation = useNavigation()
  const theme = useTheme()
  const { className } = useGlobalSearchParams<{ className?: string | string[] }>()
  const title = Array.isArray(className) ? className[0] : className || 'Class'

  const tintColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ light: Colors.light.primary, dark: Colors.dark.primary })
      : theme.colors.primary

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Text
          variant="titleMedium"
          numberOfLines={1}
          style={{
            color: theme.colors.onBackground,
            fontWeight: '600',
            lineHeight: 24,
            paddingVertical: 2,
          }}
        >
          {title}
        </Text>
      ),
      headerBackVisible: false,
      gestureEnabled: false,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.onBackground,
      headerShadowVisible: false,
    })
  }, [navigation, theme.colors.background, theme.colors.onBackground, title])

  return (
    <NativeTabs tintColor={tintColor} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger
        name="today"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sparkles', selected: 'sparkles' }}
          md="today"
        />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="lessons"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
          md="book"
        />
        <NativeTabs.Trigger.Label>Lessons</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="graph" contentStyle={{ backgroundColor: theme.colors.background }}>
        <NativeTabs.Trigger.Icon sf="point.3.connected.trianglepath.dotted" md="account_tree" />
        <NativeTabs.Trigger.Label>Graph</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="progress"
        contentStyle={{ backgroundColor: theme.colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar.xaxis', selected: 'chart.bar.xaxis' }}
          md="bar_chart"
        />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

export default ClassTabs
