
import { User, Course, ContentType, Group } from '../types';

export const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', name: 'Елена Администратор', role: 'admin', allowedContent: [] },
  { id: '2', username: 'methodist', password: '123', name: 'Анна Методист', role: 'methodist', allowedContent: [] },
  { id: '3', username: 'teacher', password: '123', name: 'Иван Учитель', role: 'teacher', allowedContent: ['c1'] },
  { id: '4', username: 'student', password: '123', name: 'Миша Студент', role: 'student', allowedContent: ['c1'], groups: ['g1'] },
  { id: 's1', username: 'ivan', password: '123', name: 'Иван Петров', role: 'student', allowedContent: [], groups: ['g1'] },
  { id: 's2', username: 'maria', password: '123', name: 'Мария Сидорова', role: 'student', allowedContent: [], groups: [] },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Kids Starter Group A',
    studentIds: ['4', 's1'],
    allowedContent: ['c1'] // Access to the whole first course
  }
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Английский для детей (Kids Starter)',
    level: 'A1',
    targetAudience: 'kids',
    modules: [
      {
        id: 'm1',
        title: 'Раздел 1: Приветствие и знакомство',
        lessons: [
          {
            id: 'l1',
            title: 'Урок 1: Давай знакомиться!',
            durationMinutes: 45,
            status: 'published',
            authorId: '2',
            rating: 5,
            readiness: 100,
            blocks: [
              { id: 'b1', type: ContentType.NOTE, content: 'Разминка: Спросите имена учеников, перебрасывая мяч.' },
              { id: 'b2', type: ContentType.TEXT, content: '## Словарь\n- Hello (Привет)\n- Hi (Привет)\n- Good morning (Доброе утро)\n- What is your name? (Как тебя зовут?)' },
              { id: 'b3', type: ContentType.IMAGE, content: 'https://picsum.photos/800/400' },
              { id: 'b4', type: ContentType.QUIZ, content: 'Соедините приветствие и время суток.', metadata: { options: ['Утро (Morning)', 'Вечер (Evening)'] } }
            ]
          },
          {
            id: 'l2',
            title: 'Урок 2: Учим цвета',
            durationMinutes: 45,
            status: 'published',
            authorId: '2',
            rating: 4,
            readiness: 80,
            blocks: [
              { id: 'b5', type: ContentType.TEXT, content: 'Учим красный, синий, зеленый и желтый цвета.' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Деловой английский (Интенсив)',
    level: 'B2',
    targetAudience: 'adults',
    modules: [
      {
        id: 'm2',
        title: 'Модуль 1: Деловая переписка',
        lessons: [
          {
            id: 'l3',
            title: 'Формальный и неформальный Email',
            durationMinutes: 60,
            status: 'draft',
            authorId: '3', // Created by teacher
            rating: 0,
            readiness: 30,
            blocks: [
              { id: 'b6', type: ContentType.TEXT, content: 'Проанализируйте тон этих двух писем и найдите отличия.' }
            ]
          }
        ]
      }
    ]
  }
];