import React, { useEffect } from 'react'
import { Tabs, useLocalSearchParams, useNavigation } from 'expo-router'

import TabIcon from '@/assets/components/TabIcon'

const ClassTabs = () => {
  const navigation = useNavigation()
  const { className } = useLocalSearchParams()

  useEffect(() => {
    navigation.setOptions({ title: className })
  }, [navigation, className])

  return (
    <Tabs>
      <Tabs.Screen
        name="lessons"
        options={{
          href: `./lessons`,
          headerShown: false,
          headerTitle: 'Your Lessons',
          tabBarLabel: 'Lessons',
          tabBarIcon: TabIcon('notebook-edit'),
        }}
      />
      <Tabs.Screen
        name="graph"
        options={{
          href: `./graph`,
          headerShown: false,
          headerTitle: 'Your Knowledge Graph',
          tabBarLabel: 'Knowledge',
          tabBarIcon: TabIcon('graph'),
        }}
      />
    </Tabs>
  )
}

export default ClassTabs
