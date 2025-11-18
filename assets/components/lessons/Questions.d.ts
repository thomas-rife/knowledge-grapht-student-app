export interface Question {
  question_id: number
  question_type: 'multiple-choice' | 'rearrange'
  prompt: string
  snippet?: string
  topics: string[]
  answer: string
  answer_options:
    | string[]
    | Array<{
        studentView: Array<{
          tokens: string[]
          problem: string[]
        }>
      }>
}

export interface MultipleChoiceData extends Omit<Question, 'question_type' | 'answer_options'> {
  question_type: 'multiple-choice'
  answer_options: string[]
}

export interface RearrangeData extends Omit<Question, 'question_type' | 'answer_options'> {
  question_type: 'rearrange'
  answer_options: {
    tokens: string[]
    problem: string[]
  }
}
