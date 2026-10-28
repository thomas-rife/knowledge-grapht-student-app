import { test } from 'node:test'
import { equal, deepEqual } from 'node:assert/strict'
import { calendarDate, hasThreeDayCadence, studyReminderDates } from './studyCadence.ts'

const keys = dates => dates.map(date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)

test('waits until the backend deadline, then reminds daily until completion', () => {
  const dates = studyReminderDates({ studiedToday: true, nextReviewDueOn: '2026-09-10' }, new Date(2026, 8, 7, 12))
  deepEqual(keys(dates), ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'])
  equal(dates.every(date => date.getHours() === 20), true)
})
test('an early completion moves reminders to the new deadline', () => {
  deepEqual(keys(studyReminderDates({ studiedToday: true, nextReviewDueOn: '2026-09-11' }, new Date(2026, 8, 8, 12))).slice(0, 1), ['2026-09-11'])
})
test('overdue deadlines remind today, but never schedule in the past', () => {
  equal(keys(studyReminderDates({ studiedToday: false, nextReviewDueOn: '2026-09-05' }, new Date(2026, 8, 10, 12)))[0], '2026-09-10')
  equal(keys(studyReminderDates({ studiedToday: false, nextReviewDueOn: '2026-09-05' }, new Date(2026, 8, 10, 21)))[0], '2026-09-11')
})
test('retains daily behavior for an older backend instead of inventing coverage', () => {
  equal(hasThreeDayCadence({ policy_id: 'daily', cadence_days: 1 }), false)
  equal(keys(studyReminderDates({ studiedToday: true }, new Date(2026, 8, 10, 12)))[0], '2026-09-11')
})
test('rejects malformed date keys rather than silently rolling into another month', () => {
  equal(calendarDate('2026-02-30'), null)
  equal(calendarDate('bad'), null)
})
