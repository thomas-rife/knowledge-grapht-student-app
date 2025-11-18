import React, { useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Animated, PanResponder, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, useTheme } from 'react-native-paper'

export default function App() {
  const router = useRouter()
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

  // Swipe indicator animation
  const swipeIndicatorOpacity = React.useRef(new Animated.Value(1)).current

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
  }, [])

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
