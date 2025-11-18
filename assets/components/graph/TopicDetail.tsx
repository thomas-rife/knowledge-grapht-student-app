import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, Modal, Portal, Button, ProgressBar, Card, Icon } from 'react-native-paper'
import { useRouter } from 'expo-router'

import { Node } from './Node'

interface TopicDetailProps {
  visible: boolean
  threshold: number
  masteryLimit: number
  selectedNode: Node
  onDismiss: () => void
}

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

const TopicDetail = ({
  visible,
  threshold,
  masteryLimit,
  selectedNode,
  onDismiss,
}: TopicDetailProps) => {
  const { label, correctResponses, occurrences, accuracy, masterable, mastered } = selectedNode
  const router = useRouter()

  //   const testLabel =
  //     'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

  const generateCardContent = () => {
    if (!masterable) {
      const progress = Math.floor((occurrences / threshold) * 100)

      return (
        <Card.Content>
          <Text style={styles.infoText}>
            Attempt {threshold - occurrences} more questions to unlock mastery!
          </Text>
          <View style={styles.progressBarContainer}>
            <ProgressBar
              color={progressBarColor(progress / 100)}
              progress={progress / 100}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </Card.Content>
      )
    } else {
      return (
        <Card.Content>
          <Text>
            Topic History: {correctResponses} / {occurrences} ({Math.floor(accuracy * 100)}%
            accuracy)
          </Text>
          {mastered ? (
            <Text
              style={[styles.infoText, { fontWeight: 'bold', textAlign: 'center', marginTop: 10 }]}
            >
              {`You are a ${accuracy >= 0.9 ? 'TRUE ' : ''}master of this topic, well done!`}
            </Text>
          ) : (
            <Text style={styles.infoText}>
              Required for Mastery: {Math.floor(masteryLimit * 100)}% accuracy
            </Text>
          )}

          <View style={styles.progressBarContainer}>
            <ProgressBar
              color={progressBarColor(accuracy)}
              progress={accuracy}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>{Math.floor(accuracy * 100)}%</Text>
          </View>
        </Card.Content>
      )
    }
  }

  const setIcon = () => {
    return (props: { size: number }) => {
      if (!masterable) {
        return <Icon size={props.size} source="lock" />
      } else if (mastered) {
        return <Icon size={props.size} source="crown" />
      } else {
        return <Icon size={props.size} source="head-question" />
      }
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={true}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
        style={styles.modalContainer}
      >
        <Card>
          <Card.Title
            title={label}
            titleVariant="titleLarge"
            titleStyle={styles.modalTitle}
            titleNumberOfLines={10}
            left={setIcon()}
            right={(props: { size: number }) => (
              <Button onPress={() => onDismiss()}>
                <Icon size={props.size} source="window-close" />
              </Button>
            )}
            rightStyle={{ paddingEnd: 15 }}
          />

          {generateCardContent()}

          <Card.Actions style={styles.buttons}>
            <Button
              mode="contained"
              icon="book-open-variant"
              labelStyle={styles.practiceText}
              onPress={() => {
                // Navigate to Lessons screen filtered by this topic
                router.push({
                  pathname: './lessons',
                  params: { topic: selectedNode.label },
                })
                onDismiss()
              }}
            >
              Practice this topic
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  )
}

const progressBarHeight = 30

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'flex-end',
    paddingBottom: '13%',
  },
  modalContent: {
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  modalTitle: {
    // flexWrap: 'wrap',
    // textAlign: 'left',
  },
  modalButton: {
    // marginTop: 16,
  },
  buttons: {
    flexDirection: 'column',
    marginBottom: 2,
    // backgroundColor: 'red',
  },
  practiceText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginVertical: 3,
  },
  progressBar: {
    height: progressBarHeight,
    borderRadius: progressBarHeight / 3,
  },
  progressText: {
    color: 'black',
    position: 'absolute',
    alignSelf: 'center',
    fontWeight: 'bold',
    fontSize: progressBarHeight - 5,
  },
  infoText: {
    fontSize: 15,
  },
})

export default TopicDetail
