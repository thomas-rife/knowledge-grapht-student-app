import React, { useEffect, useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { supabase } from '@/supabaseClient'
import LoadingIndicator from '@/assets/components/common/LoadingIndicator'

export default function App() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const pan = useRef(new Animated.ValueXY()).current
  const theme = useTheme()

  // Swipe Gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        // Reset position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start()
        // Swiping more than 100 units, navigate to login page
        if (gestureState.dy < -100) {
          router.push('./login')
        }
      },
    })
  ).current

  const swipeIndicatorOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Create a pulsing animation for the swipe indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(swipeIndicatorOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(swipeIndicatorOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [swipeIndicatorOpacity])

  useEffect(() => {
    // Check for existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is logged in, go directly to classes
        router.replace('/(tabs)/classes')
      } else {
        // No session, show landing page
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(tabs)/classes')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Show loading while checking session
  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingIndicator />
      </View>
    )
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: pan.y }] }]}
      {...panResponder.panHandlers}
    >
      <Image style={styles.logo} source={require('@/assets/images/KGLogo.png')} />

      {/* Swipe indicator */}
      <View style={styles.swipeIndicatorContainer}>
        <Text style={{ ...styles.swipeText, color: theme.colors.onBackground }}>
          Swipe up to login
        </Text>
        <Animated.View style={[styles.arrow, { opacity: swipeIndicatorOpacity }]}>
          <Text style={{ ...styles.arrowIcon, color: theme.colors.onBackground }}>↑</Text>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeIndicatorContainer: {
    top: 25,
    alignItems: 'center',
  },
  swipeText: {
    fontSize: 16,
    marginBottom: 10,
    opacity: 0.8,
  },
  arrow: {
    padding: 10,
  },
  arrowIcon: {
    fontSize: 24,
  },
  logo: {
    resizeMode: 'contain',
    width: '80%',
    height: '40%',
  },
})
