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

  /* These three items are NOT received from the server and are calculated upon retrieval. */
  accuracy: number
  masterable: boolean
  mastered: boolean
}
