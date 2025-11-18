import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated'

interface EdgeProps {
  start: { x: number; y: number }
  end: { x: number; y: number }
}

const speed = 2000
const thickness = 15

const Path = ({ start, end }: EdgeProps) => {
  // Animation progress value (0 to 1)
  const theme = useTheme()
  const progress = useSharedValue(0)

  const width = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
  const angle = Math.atan2(end.y - start.y, end.x - start.x)

  // Set up the animation on component mount
  useEffect(() => {
    progress.value = 0
    // Create a repeating animation
    progress.value = withRepeat(
      withTiming(1, {
        duration: speed,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Repeat infinitely
      false // Don't reverse the animation
    )

    // Clean up the animation when component unmounts
    return () => cancelAnimation(progress)
  }, [])

  // Create the animated style for the ripple effect
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      backgroundColor: theme.colors.primary,
      opacity: interpolate(progress.value, [0, 0.2, 0.8, 1], [0.1, 0.7, 0.7, 0.1]),
      width: width,
      height: thickness,
      transform: [
        {
          translateX: interpolate(progress.value, [0, 1], [-width, width]),
        },
      ],
    }
  })

  return (
    <View
      style={[
        styles.edge,
        {
          left: start.x,
          top: start.y,
          transform: [
            {
              rotate: `${angle}rad`,
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.ripple,
          {
            width,
            height: thickness,
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <Animated.View style={animatedStyle} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', transformOrigin: 'left' },
  ripple: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default Path
