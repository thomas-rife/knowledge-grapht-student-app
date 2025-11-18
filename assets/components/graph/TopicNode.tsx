import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, ProgressBar, Card, Icon } from 'react-native-paper'
import { Node } from './Node'
interface NodeProps {
  node: Node
  maxWidth: number
  threshold: number
  onPress: (id: number) => void
}

const TopicNode = ({ node, maxWidth, threshold, onPress }: NodeProps) => {
  const { id, label, position, accuracy, occurrences, masterable, mastered }: Node = node
  const active = true //node.isActive

  const progressBarColor = (progress: number) => {
    /**
     * @TODO Add progress colors to theme
     * @TODO Set text color based on progress?
     */
    if (progress >= 1) {
      return '#0CBFE9' // blue
    } else if (progress >= 0.75) {
      return '#86DC3D' // green
    } else if (progress >= 0.5) {
      return '#FFDE21' // yellow
    } else if (progress >= 0.25) {
      return '#E27602' // orange
    } else {
      return '#FF0000' // red
    }
  }

  const makeProgressBar = () => {
    if (!masterable) {
      const progress = Math.floor((occurrences / threshold) * 100)

      return (
        <ProgressBar
          color={progressBarColor(progress / 100)}
          progress={progress / 100}
          style={styles.progressBar}
        />
      )
    } else {
      return (
        <ProgressBar
          color={progressBarColor(accuracy)}
          progress={accuracy}
          style={styles.progressBar}
        />
      )
    }
  }

  const setIcon = () => {
    if (active) {
      if (!masterable) {
        return <Icon size={styles.titleText.fontSize + 10} source="lock" />
      } else if (mastered) {
        return <Icon size={styles.titleText.fontSize + 10} source="crown" />
      } else {
        return <Icon size={styles.titleText.fontSize + 10} source="head-question" />
      }
    } else {
      return <Icon size={styles.titleText.fontSize + 10} source="cancel" />
    }
  }

  const testlabel =
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

  return (
    <Card
      disabled={!active}
      onPress={() => onPress(id)}
      elevation={1}
      style={[
        styles.node,
        {
          left: position.x,
          top: position.y,
          maxWidth,
        },
      ]}
    >
      <Card.Content>
        <View style={styles.titleBar}>
          {setIcon()}
          <Text variant="headlineSmall" style={[styles.titleText, { width: maxWidth * 0.7 }]}>
            {label}
          </Text>
        </View>
        {active && makeProgressBar()}
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    position: 'absolute',
    borderRadius: 8,
    // backgroundColor: 'transparent',
  },
  titleBar: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'center',
    paddingBottom: 10,
  },
  titleText: {
    fontSize: 20,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  progressBar: {
    alignSelf: 'center',
  },
})

export default TopicNode
