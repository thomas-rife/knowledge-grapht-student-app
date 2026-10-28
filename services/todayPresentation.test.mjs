import { test } from 'node:test'
import { equal } from 'node:assert/strict'
import { getTodayRecommendationLabel } from './todayPresentation.ts'

test('a fulfilled study goal labels the available quiz as recommended rather than due', () => {
  equal(getTodayRecommendationLabel('due_today', true), 'Recommended')
  equal(getTodayRecommendationLabel('overdue', true), 'Recommended')
  equal(getTodayRecommendationLabel('recommended', true), 'Recommended')
})

test('a due study goal retains the recommendation due status', () => {
  equal(getTodayRecommendationLabel('due_today', false), 'Due today')
  equal(getTodayRecommendationLabel('overdue', false), 'Overdue')
  equal(getTodayRecommendationLabel('recommended', false), 'Recommended')
})

test('the due label returns when backend coverage is no longer fulfilled', () => {
  equal(getTodayRecommendationLabel('due_today', true), 'Recommended')
  equal(getTodayRecommendationLabel('due_today', false), 'Due today')
})
