/** Keep optional practice available without implying another quiz is required for the streak. */
export function getTodayRecommendationLabel(
  status: 'overdue' | 'due_today' | 'recommended',
  goalComplete: boolean
) {
  if (goalComplete) return 'Recommended'
  if (status === 'overdue') return 'Overdue'
  if (status === 'due_today') return 'Due today'
  return 'Recommended'
}
