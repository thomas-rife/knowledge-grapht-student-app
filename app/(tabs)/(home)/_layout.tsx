import React from 'react'
import { Tabs } from 'expo-router'

import TabIcon from '@/assets/components/TabIcon'

const HomeTabs = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          headerShown: false,
          tabBarIcon: TabIcon('home'),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: TabIcon('account'),
        }}
      />
    </Tabs>
  )
}

export default HomeTabs
