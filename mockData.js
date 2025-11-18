export const testStudentClassIDs = [1, 2, 3, 4]

export const testStudentClasses = [
  {
    class_id: 1,
    name: 'TEST CMSI',
    section_number: 'T',
    description: 'Test class',
  },
  {
    class_id: 2,
    name: 'TEST CMSI 2',
    section_number: 'T2',
    description: 'Test class 2',
  },
  {
    class_id: 3,
    name: 'TEST CMSI 3',
    section_number: 'T3',
    description: 'Test class 3',
  },
  {
    class_id: 4,
    name: 'TEST CMSI 4',
    section_number: 'T4',
    description: 'Test class 4',
  },
]

export const testStudentLessonIDs = [1, 2, 3, 4]

export const testStudentLessons = [
  {
    lesson_id: 1,
    name: 'Lesson 1',
    topics: ['topic 1', 'topic 2', 'topic 3'],
  },
  {
    lesson_id: 2,
    name: 'Lesson 2',
    topics: ['topic 1'],
  },
  {
    lesson_id: 3,
    name: 'Lesson 3',
    topics: ['topic 1'],
  },
  {
    lesson_id: 4,
    name: 'Lesson 4',
    topics: ['topic 1', 'topic 2', 'topic 3'],
  },
]

export const testStudentQuestionIDs = [1, 2, 3, 4]

export const testStudentLessonQuestions = [
  {
    question_id: 1,
    question_type: 'Multiple Choice',
    prompt: 'This is a prompt that the user should answer.',
    snippet: 'This is a snippet to hopefully help the user.',
    topics: ['topic 1', 'topic 2'],
    answer_options: ['Test Answer 1', 'Test Answer 2', 'Test Answer 3', 'Test Answer 4'],
    answer: 'Test Answer 1',
  },
  {
    question_id: 2,
    question_type: 'Multiple Choice',
    prompt: 'This is a prompt that the user should answer.',
    snippet: 'This is a snippet to hopefully help the user.',
    topics: ['topic 1', 'topic 2'],
    answer_options: ['Test Answer 1', 'Test Answer 2', 'Test Answer 3', 'Test Answer 4'],
    answer: 'Test Answer 2',
  },
  {
    question_id: 3,
    question_type: 'Multiple Choice',
    prompt: 'This is a prompt that the user should answer 3.',
    snippet: 'This is a snippet to hopefully help the user 3.',
    topics: ['topic 1', 'topic 2'],
    answer_options: ['Test Answer 1', 'Test Answer 2', 'Test Answer 3', 'Test Answer 4'],
    answer: 'Test Answer 2',
  },
  {
    question_id: 4,
    question_type: 'Multiple Choice',
    prompt: 'This is a prompt that the user should answer 4.',
    snippet: 'This is a snippet to hopefully help the user 4.',
    topics: ['topic 1', 'topic 2'],
    answer_options: ['Test Answer 1', 'Test Answer 2', 'Test Answer 3', 'Test Answer 4'],
    answer: 'Test Answer 2',
  },
  {
    question_id: 5,
    question_type: 'rearrange',
    prompt: '1010 rearrange prompt goes here',
    snippet: 'snippets are required for this question',
    topics: ['test topic 1', 'test topic 2', 'test topic 3'],
    answer_options: [
      [
        {
          studentView: [
            {
              tokens: ['rearrange'],
              problem: ["print('_________')"],
            },
          ],
        },
      ],
    ],
    answer: "print('rearrange')",
  },
  {
    question_id: 6,
    question_type: 'rearrange',
    prompt: '1010 rearrange prompt goes here',
    snippet: 'snippets are required for this question',
    topics: ['test topic 1', 'test topic 2', 'test topic 3'],
    answer_options: [
      [
        {
          studentView: [
            {
              tokens: ['rearrange', 'print'],
              problem: ["print('_________')"],
            },
          ],
        },
      ],
    ],
    answer: "print('rearrange')",
  },
  {
    question_id: 7,
    question_type: 'rearrange',
    prompt: '1010 rearrange prompt goes here',
    snippet: 'snippets are required for this question',
    topics: ['test topic 1', 'test topic 2', 'test topic 3'],
    answer_options: [
      [
        {
          studentView: [
            {
              tokens: ['rearrange', '('],
              problem: ["print('_________')"],
            },
          ],
        },
      ],
    ],
    answer: "print('rearrange')",
  },
  {
    question_id: 8,
    question_type: 'rearrange',
    prompt: '1010 rearrange prompt goes here',
    snippet: 'snippets are required for this question',
    topics: ['test topic 1', 'test topic 2', 'test topic 3'],
    answer_options: [
      [
        {
          studentView: [
            {
              tokens: ['rearrange', ')'],
              problem: ["print('_________')"],
            },
          ],
        },
      ],
    ],
    answer: "print('rearrange')",
  },
]

export const testStudentKGs = [
  {
    class_id: 1,
    graph_id: 1,
    nodes: ['topic 1', 'topic 2', 'topic 3', 'topic 4'],
    edges: [
      ['topic 1', 'topic 2'],
      ['topic 1', 'topic 3'],
      ['topic 2', 'topic 3'],
      ['topic 3', 'topic 4'],
    ],
    react_flow_data: [
      {
        reactFlowEdges: [
          {
            id: 'topic 1-topic 2',
            source: 'topic 1',
            target: 'topic 2',
            animated: true,
          },
          {
            id: 'topic 1-topic 3',
            source: 'topic 1',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 2-topic 3',
            source: 'topic 2',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 3-topic 4',
            source: 'topic 3',
            target: 'topic 4',
            animated: true,
          },
        ],
        reactFlowNodes: [
          {
            id: 'topic 1',
            data: { label: 'topic 1' },
            type: 'default',
            position: { x: 100, y: 100 },
          },
          {
            id: 'topic 2',
            data: { label: 'topic 2' },
            type: 'default',
            position: { x: 300, y: 100 },
          },
          {
            id: 'topic 3',
            data: { label: 'topic 3' },
            type: 'default',
            position: { x: 300, y: 300 },
          },
          {
            id: 'topic 4',
            data: { label: 'topic 4' },
            type: 'default',
            position: { x: 500, y: 300 },
          },
        ],
      },
    ],
  },
  {
    class_id: 2,
    graph_id: 2,
    nodes: ['topic 1', 'topic 2', 'topic 3', 'topic 4'],
    edges: [
      ['topic 1', 'topic 2'],
      ['topic 1', 'topic 3'],
      ['topic 2', 'topic 3'],
      ['topic 3', 'topic 4'],
    ],
    react_flow_data: [
      {
        reactFlowEdges: [
          {
            id: 'topic 1-topic 2',
            source: 'topic 1',
            target: 'topic 2',
            animated: true,
          },
          {
            id: 'topic 1-topic 3',
            source: 'topic 1',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 2-topic 3',
            source: 'topic 2',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 3-topic 4',
            source: 'topic 3',
            target: 'topic 4',
            animated: true,
          },
        ],
        reactFlowNodes: [
          {
            id: 'topic 1',
            data: { label: 'topic 1' },
            type: 'default',
            position: { x: 100, y: 100 },
          },
          {
            id: 'topic 2',
            data: { label: 'topic 2' },
            type: 'default',
            position: { x: 300, y: 100 },
          },
          {
            id: 'topic 3',
            data: { label: 'topic 3' },
            type: 'default',
            position: { x: 300, y: 300 },
          },
          {
            id: 'topic 4',
            data: { label: 'topic 4' },
            type: 'default',
            position: { x: 500, y: 300 },
          },
        ],
      },
    ],
  },
  {
    class_id: 3,
    graph_id: 3,
    nodes: ['topic 1', 'topic 2', 'topic 3', 'topic 4'],
    edges: [
      ['topic 1', 'topic 2'],
      ['topic 1', 'topic 3'],
      ['topic 2', 'topic 3'],
      ['topic 3', 'topic 4'],
    ],
    react_flow_data: [
      {
        reactFlowEdges: [
          {
            id: 'topic 1-topic 2',
            source: 'topic 1',
            target: 'topic 2',
            animated: true,
          },
          {
            id: 'topic 1-topic 3',
            source: 'topic 1',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 2-topic 3',
            source: 'topic 2',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 3-topic 4',
            source: 'topic 3',
            target: 'topic 4',
            animated: true,
          },
        ],
        reactFlowNodes: [
          {
            id: 'topic 1',
            data: { label: 'topic 1' },
            type: 'default',
            position: { x: 100, y: 100 },
          },
          {
            id: 'topic 2',
            data: { label: 'topic 2' },
            type: 'default',
            position: { x: 300, y: 100 },
          },
          {
            id: 'topic 3',
            data: { label: 'topic 3' },
            type: 'default',
            position: { x: 300, y: 300 },
          },
          {
            id: 'topic 4',
            data: { label: 'topic 4' },
            type: 'default',
            position: { x: 500, y: 300 },
          },
        ],
      },
    ],
  },
  {
    class_id: 4,
    graph_id: 4,
    nodes: ['topic 1', 'topic 2', 'topic 3', 'topic 4'],
    edges: [
      ['topic 1', 'topic 2'],
      ['topic 1', 'topic 3'],
      ['topic 2', 'topic 3'],
      ['topic 3', 'topic 4'],
    ],
    react_flow_data: [
      {
        reactFlowEdges: [
          {
            id: 'topic 1-topic 2',
            source: 'topic 1',
            target: 'topic 2',
            animated: true,
          },
          {
            id: 'topic 1-topic 3',
            source: 'topic 1',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 2-topic 3',
            source: 'topic 2',
            target: 'topic 3',
            animated: true,
          },
          {
            id: 'topic 3-topic 4',
            source: 'topic 3',
            target: 'topic 4',
            animated: true,
          },
        ],
        reactFlowNodes: [
          {
            id: 'topic 1',
            data: { label: 'topic 1' },
            type: 'default',
            position: { x: 100, y: 100 },
          },
          {
            id: 'topic 2',
            data: { label: 'topic 2' },
            type: 'default',
            position: { x: 300, y: 100 },
          },
          {
            id: 'topic 3',
            data: { label: 'topic 3' },
            type: 'default',
            position: { x: 300, y: 300 },
          },
          {
            id: 'topic 4',
            data: { label: 'topic 4' },
            type: 'default',
            position: { x: 500, y: 300 },
          },
        ],
      },
    ],
  },
]
