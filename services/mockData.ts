import { User, Course, ContentType } from '../types';

export const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', name: 'Elena Administrator', role: 'admin' },
  { id: '2', username: 'methodist', password: '123', name: 'Sarah Method', role: 'methodist' },
  { id: '3', username: 'teacher', password: '123', name: 'John Teach', role: 'teacher' },
  { id: '4', username: 'student', password: '123', name: 'Mike Student', role: 'student' },
  { id: 's1', username: 'ivan', password: '123', name: 'Ivan Petrov', role: 'student' },
  { id: 's2', username: 'maria', password: '123', name: 'Maria S.', role: 'student' },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'General English for Kids',
    level: 'A1',
    targetAudience: 'kids',
    modules: [
      {
        id: 'm1',
        title: 'Unit 1: Hello & Welcome',
        lessons: [
          {
            id: 'l1',
            title: 'Lesson 1: Greetings',
            durationMinutes: 45,
            status: 'published',
            rating: 5,
            readiness: 100,
            blocks: [
              { id: 'b1', type: ContentType.NOTE, content: 'Warm-up: Ask students their names using a ball toss game.' },
              { id: 'b2', type: ContentType.TEXT, content: '## Vocabulary\n- Hello\n- Hi\n- Good morning\n- What is your name?' },
              { id: 'b3', type: ContentType.IMAGE, content: 'https://picsum.photos/800/400' },
              { id: 'b4', type: ContentType.QUIZ, content: 'Match the greeting with the time of day.', metadata: { options: ['Morning', 'Evening'] } }
            ]
          },
          {
            id: 'l2',
            title: 'Lesson 2: Colors',
            durationMinutes: 45,
            status: 'published',
            rating: 4,
            readiness: 80,
            blocks: [
              { id: 'b5', type: ContentType.TEXT, content: 'Learning Red, Blue, Green, and Yellow.' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Business English Intensive',
    level: 'B2',
    targetAudience: 'adults',
    modules: [
      {
        id: 'm2',
        title: 'Module 1: Correspondence',
        lessons: [
          {
            id: 'l3',
            title: 'Formal vs Informal Email',
            durationMinutes: 60,
            status: 'draft',
            rating: 0,
            readiness: 30,
            blocks: [
              { id: 'b6', type: ContentType.TEXT, content: 'Analyze the tone of these two emails.' }
            ]
          }
        ]
      }
    ]
  }
];