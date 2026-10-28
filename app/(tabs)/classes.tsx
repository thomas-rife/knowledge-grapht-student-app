import InputCodeModal from '@/assets/components/classes/InputCodeModal'
import { useRouter } from 'expo-router'
import React, { useState, useEffect, useCallback } from 'react'
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Chip, Icon, Divider } from 'react-native-paper'
import { supabase } from '@/supabaseClient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { setupStudyReminders } from '@/services/notifications'

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

  useEffect(() => {
    void setupStudyReminders()
  }, [])

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // console.log('=== FETCH CLASSES DEBUG ===')

        // Get the Supabase session token
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log('Session exists?:', !!session)
        console.log('Access token exists?:', !!session?.access_token)

        if (!session?.access_token) {
          // console.log('No session token, redirecting to login...')
          router.replace('/(auth)/login')
          return
        }

        const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
        // console.log('1. API Base URL:', base)

        const url = base.endsWith('/')
          ? `${base}user/enrolled-classes`
          : `${base}/user/enrolled-classes`

        // console.log('2. Full URL:', url)
        // console.log('3. Starting fetch with auth token...')

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.status === 401) {
          router.replace('/(auth)/login')
          return
        }

        // console.log('4. Response received')
        // console.log('   - Status:', response.status)
        // console.log('   - Status Text:', response.statusText)
        // console.log('   - OK?:', response.ok)

        const contentType = response.headers.get('content-type') || ''
        // console.log('   - Content-Type:', contentType)

        const raw = await response.text()
        // console.log('5. Raw response length:', raw.length)
        // console.log('   - First 200 chars:', raw.substring(0, 200))

        let data: any = null
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(raw)
            // console.log('6. JSON parsed successfully')
            // console.log('   - Is Array?:', Array.isArray(data))
            // console.log('   - Data length:', Array.isArray(data) ? data.length : 'N/A')
          } catch (parseErr) {
            console.error('6. JSON parse failed:', parseErr)
          }
        } else {
          // console.log('6. Response is not JSON')
        }

        if (Array.isArray(data)) {
          // console.log('7. Setting classes:', data.length, 'items')
          setClasses(data)
        } else {
          // console.log('7. Data is not an array, setting empty')
          setClasses([])
        }

        // console.log('=== FETCH COMPLETE ===')
      } catch (e) {
        console.error('=== FETCH ERROR ===')
        console.error('Error type:', e instanceof TypeError ? 'Network/TypeError' : typeof e)
        console.error('Error message:', e instanceof Error ? e.message : String(e))
        console.error('Full error:', e)
        setClasses([])
      } finally {
        setRefreshing(false)
      }
    }

    fetchClasses()
  }, [refreshing, router])

  const refresh = useCallback(() => {
    setRefreshing(true)
  }, [])

  const enroll = async (joinCode: string | string[]) => {
    try {
      const combined = Array.isArray(joinCode) ? joinCode.join('') : String(joinCode)
      const alphanumeric = combined.replace(/[^a-zA-Z0-9]/g, '')

      if (alphanumeric.length !== 6) {
        alert('Please enter your 6-character class code.')
        return false
      }

      // Get the Supabase session token
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Not logged in. Please log in again.')
        router.replace('/(auth)/login')
        return false
      }

      const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
      const url = base.endsWith('/') ? `${base}user/join-class` : `${base}/user/join-class`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: alphanumeric }),
      })

      if (response.status === 401) {
        alert('Session expired. Please log in again.')
        router.replace('/(auth)/login')
        return false
      }

      const contentType = response.headers.get('content-type') || ''
      const raw = await response.text()
      let data: any = null
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(raw)
        } catch {
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
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View style={styles.list}>
            {classes?.map(({ class_id, name, description, section_number }) => (
              <Card
                key={class_id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/[classId]/today',
                    params: {
                      classId: String(class_id),
                      className: name || `Class ${class_id}`,
                    },
                  })
                }
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
    </SafeAreaView>
  )
}

export default Classes

const styles = StyleSheet.create({
  container: {
    padding: 16,
    // Leave enough scrollable space for the floating iOS 26 liquid-glass tab bar.
    paddingBottom: 112,
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
