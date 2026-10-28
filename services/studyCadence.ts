// The backend owns streak calculation. These helpers only format its dates
// and turn its next deadline into device-local notification times.
export type StreakDay = {
  date: string
  completed: boolean
  completions: number
  covered?: boolean
}

export type StudyStreak = {
  current_streak: number
  longest_streak: number
  studied_today: boolean
  today_completed_count?: number
  week?: StreakDay[]
  policy_id?: string
  cadence_days?: number
  today?: string
  next_review_due_on?: string
  covered_through?: string | null
  covered_today?: boolean
  review_due?: boolean
  timeline?: StreakDay[]
}

export const hasThreeDayCadence = (streak?: StudyStreak | null) =>
  streak?.policy_id === 'rolling_three_day_v1' && streak.cadence_days === 3

export function calendarDate(dateKey: string | undefined | null) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function formatStudyDate(dateKey: string | undefined | null) {
  return calendarDate(dateKey)?.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  }) || ''
}

export function studyReminderDates(
  state: { studiedToday: boolean; nextReviewDueOn?: string | null },
  now = new Date(),
  daysToSchedule = 7,
  reminderHour = 20
) {
  const due = calendarDate(state.nextReviewDueOn)
  const dates: Date[] = []
  for (let offset = 0; offset < daysToSchedule; offset += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() + offset)
    date.setHours(reminderHour, 0, 0, 0)
    // Suppress reminders during backend-provided coverage. Once due, remind
    // daily until a new completion response replaces the owned schedule.
    if (due && new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12) < due) continue
    if (!due && offset === 0 && state.studiedToday) continue
    if (date.getTime() > now.getTime() + 60_000) dates.push(date)
  }
  return dates
}
