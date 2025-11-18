import InputCodeModal from '@/assets/components/classes/InputCodeModal'
import { useRouter } from 'expo-router'
import React, { useState, useEffect, useCallback } from 'react'
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Chip, Icon, Divider } from 'react-native-paper'

interface ClassData {
  class_id: number
  description: string | null
  name: string | null
  section_number: string | null
}

const Classes = () => {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [joinModal, setJoinModal] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(true)

  const router = useRouter()

  /**
   * Fetches classes.
   *
   * Invokes at the opening of the page, and then any time that "refreshing" is set true.
   */
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
        const url = base.endsWith('/')
          ? `${base}user/enrolled-classes`
          : `${base}/user/enrolled-classes`

        const response = await fetch(url, { credentials: 'include' as RequestCredentials })
        const contentType = response.headers.get('content-type') || ''
        const raw = await response.text()

        let data: any = null
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(raw)
          } catch {}
        }

        if (Array.isArray(data)) {
          setClasses(data)
        } else {
          // not an array or not JSON; likely an auth error or HTML
          setClasses([])
        }
      } catch (e) {
        setClasses([])
      } finally {
        setRefreshing(false)
      }
    }

    fetchClasses()
  }, [refreshing])

  /**
   * Callable at any time to trigger a refresh, fetching class data from the server.
   */
  const refresh = useCallback(() => {
    setRefreshing(true)
  }, [])

  const enroll = async (joinCode: string | string[]) => {
    try {
      // Normalize: handle array of chars or a single string, strip spaces/dashes only
      const combined = Array.isArray(joinCode) ? joinCode.join('') : String(joinCode)
      const alphanumeric = combined.replace(/[^a-zA-Z0-9]/g, '')

      if (alphanumeric.length !== 6) {
        alert('Please enter your 6-character class code.')
        return false
      }

      const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
      const url = base.endsWith('/') ? `${base}user/join-class` : `${base}/user/join-class`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ code: alphanumeric }),
      })

      const contentType = response.headers.get('content-type') || ''
      const raw = await response.text()
      let data: any = null
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(raw)
        } catch (e) {
          throw new Error('Could not parse server response')
        }
      } else {
        throw new Error(`Unexpected server response: ${raw.slice(0, 120)}`)
      }

      if (!response.ok || data?.success === false) {
        const msg = data?.error || `Join failed (${response.status})`
        throw new Error(msg)
      }

      setJoinModal(false)
      refresh()
      return true
    } catch (error: any) {
      alert(`Failed to enroll: ${error?.message || String(error)}`)
      return false
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
          Your Classes
        </Text>

        <Chip
          icon="notebook-plus"
          onPress={() => setJoinModal(true)}
          style={styles.joinButton}
          elevated={true}
        >
          Add Class
        </Chip>
      </View>

      <Divider bold={true} />

      <ScrollView
        contentContainerStyle={styles.container}
        // Enables pull-to-refresh on the list
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.list}>
          {classes?.map(({ class_id, name, description, section_number }) => (
            <Card
              key={class_id}
              style={styles.card}
              onPress={() => router.push(`../${class_id}/lessons?className=${name}`)}
            >
              <Card.Title
                title={name}
                titleVariant="titleLarge"
                subtitle={section_number ? section_number : ''}
                subtitleVariant="titleMedium"
                left={(props: { size: number }) => (
                  <Icon source="notebook-edit" size={props.size} />
                )}
              />

              {description && (
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.description}>
                    {description}
                  </Text>
                </Card.Content>
              )}
            </Card>
          ))}

          {classes?.length === 0 && !refreshing && (
            <View style={styles.noClassesContainer}>
              <Text style={{ textAlign: 'center' }} variant="titleLarge">
                {"You're not enrolled in a class yet.\n\nUse the "}
                <Text style={{ fontWeight: 'bold' }}>Add Class</Text>
                {' button above and enter the 6 digit code from your instructor to enroll!'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <InputCodeModal
        visible={joinModal}
        onSubmit={otp => enroll(otp)}
        onClose={() => setJoinModal(false)}
      />
    </View>
  )
}

export default Classes

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 15,
    zIndex: 1,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 8,
    borderRadius: 8,
    elevation: 2,
  },
  description: {
    fontStyle: 'italic',
  },
  noClassesContainer: {
    marginTop: '50%',
    alignItems: 'center',
    padding: 15,
  },
  joinButton: {
    zIndex: 3,
    justifyContent: 'center',
  },
})
