import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { studyReminderDates } from './studyCadence'

const REMINDER_CHANNEL_ID = 'study-reminders'
const REMINDER_KIND = 'knowledge-grapht-study-reminder'
const SCHEDULE_VERSION = 4
const STORAGE_KEY = `studyReminderSchedule:v${SCHEDULE_VERSION}`
const REMINDER_HOUR = 20
const DAYS_TO_SCHEDULE = 7

type StoredSchedule = {
  version: number
  identifiers: string[]
  signature: string
}

export type StudyReminderState = {
  classId?: number | string | null
  className?: string | null
  currentStreak: number
  studiedToday: boolean
  nextReviewDueOn?: string | null
  cadenceDays?: number
}

export type ReminderSetupResult =
  | { status: 'scheduled' | 'already-scheduled'; count: number }
  | { status: 'permission-denied' | 'failed'; count: 0 }

let notificationHandlerConfigured = false

export function configureNotificationHandling() {
  if (notificationHandlerConfigured) return

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  })

  notificationHandlerConfigured = true
}

async function readStoredSchedule(): Promise<StoredSchedule | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSchedule>
    if (
      parsed.version === SCHEDULE_VERSION &&
      typeof parsed.signature === 'string' &&
      Array.isArray(parsed.identifiers) &&
      parsed.identifiers.every(identifier => typeof identifier === 'string')
    ) {
      return parsed as StoredSchedule
    }
  } catch {
    // A fresh owned schedule below repairs invalid local metadata.
  }

  return null
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Study reminders',
    description: 'Reminders when your next Knowledge Grapht quiz is due.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 200, 250],
    showBadge: true,
  })
}

async function hasNotificationPermission() {
  let permissions = await Notifications.getPermissionsAsync()

  if (permissions.status !== 'granted' && permissions.canAskAgain) {
    permissions = await Notifications.requestPermissionsAsync()
  }

  return permissions.status === 'granted'
}

async function cancelOwnedReminders(storedSchedule?: StoredSchedule | null) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const identifiers = new Set(storedSchedule?.identifiers ?? [])

  for (const request of scheduled) {
    if (request.content.data?.kind === REMINDER_KIND) {
      identifiers.add(request.identifier)
    }
  }

  await Promise.all(
    Array.from(identifiers, identifier =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
    )
  )
}

function scheduleSignature(state: StudyReminderState, dates: Date[]) {
  return JSON.stringify({
    version: SCHEDULE_VERSION,
    classId: state.classId == null ? null : String(state.classId),
    className: state.className?.trim() || null,
    currentStreak: Math.max(0, Math.floor(state.currentStreak || 0)),
    studiedToday: state.studiedToday,
    nextReviewDueOn: state.nextReviewDueOn || null,
    cadenceDays: state.cadenceDays || 1,
    dates: dates.map(date => date.toISOString()),
  })
}

export async function syncStudyReminders(
  state: StudyReminderState
): Promise<ReminderSetupResult> {
  try {
    configureNotificationHandling()
    await ensureAndroidChannel()

    if (!(await hasNotificationPermission())) {
      return { status: 'permission-denied', count: 0 }
    }

    const dates = studyReminderDates(state, new Date(), DAYS_TO_SCHEDULE, REMINDER_HOUR)
    const signature = scheduleSignature(state, dates)
    const storedSchedule = await readStoredSchedule()
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    const scheduledIds = new Set(scheduled.map(request => request.identifier))
    const scheduleIsCurrent =
      storedSchedule?.signature === signature &&
      storedSchedule.identifiers.length === dates.length &&
      storedSchedule.identifiers.every(identifier => scheduledIds.has(identifier))

    if (scheduleIsCurrent) {
      return { status: 'already-scheduled', count: dates.length }
    }

    await cancelOwnedReminders(storedSchedule)

    const streak = Math.max(0, Math.floor(state.currentStreak || 0))
    const className = state.className?.trim()
    const identifiers: string[] = []
    try {
      for (const [index, date] of dates.entries()) {
        const title =
          streak > 0 ? 'Keep your study streak going' : 'Your next review is due'
        const body = className
          ? `Complete one ${className} quiz today. Any completed lesson or review counts.`
          : 'Complete one quiz today. Any completed lesson or review counts.'
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            data: {
              kind: REMINDER_KIND,
              scheduleVersion: SCHEDULE_VERSION,
              classId: state.classId == null ? null : String(state.classId),
              reminderIndex: index,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
          },
        })
        identifiers.push(identifier)
      }
    } catch (error) {
      await Promise.all(
        identifiers.map(identifier =>
          Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
        )
      )
      throw error
    }

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEDULE_VERSION, identifiers, signature } satisfies StoredSchedule)
    )

    return { status: 'scheduled', count: identifiers.length }
  } catch (error) {
    console.error('Failed to sync study reminders', error)
    return { status: 'failed', count: 0 }
  }
}

export async function setupStudyReminders(): Promise<ReminderSetupResult> {
  try {
    const storedSchedule = await readStoredSchedule()
    if (storedSchedule?.identifiers.length) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      const scheduledIds = new Set(scheduled.map(request => request.identifier))
      if (storedSchedule.identifiers.every(identifier => scheduledIds.has(identifier))) {
        return { status: 'already-scheduled', count: storedSchedule.identifiers.length }
      }
    }
  } catch {
    // syncStudyReminders below repairs missing or unreadable metadata.
  }

  return syncStudyReminders({ currentStreak: 0, studiedToday: false })
}

export function getStudyReminderClassId(
  response: Notifications.NotificationResponse | null | undefined
) {
  const data = response?.notification.request.content.data
  if (data?.kind !== REMINDER_KIND) return null
  const classId = data.classId
  return typeof classId === 'string' && classId.trim() ? classId : null
}

export async function clearStudyReminders() {
  try {
    const storedSchedule = await readStoredSchedule()
    await cancelOwnedReminders(storedSchedule)
  } catch (error) {
    console.error('Failed to clear study reminders', error)
  } finally {
    await AsyncStorage.removeItem(STORAGE_KEY)
  }
}
