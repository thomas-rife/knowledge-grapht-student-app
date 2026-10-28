/**
 * Type that describes node data. Not to be confused with the TopicNode component.
 */
export interface Node {
  id: number
  isActive: boolean
  label: string
  position: { x: number; y: number }
  correctResponses: number
  occurrences: number
  lastReviewed?: string | null
  nextReview?: string | null
  /** Number of linked class questions tagged with this topic; absent on older APIs. */
  availableQuestionCount?: number

  /* These three items are NOT received from the server and are calculated upon retrieval. */
  accuracy: number
  masterable: boolean
  mastered: boolean
}
