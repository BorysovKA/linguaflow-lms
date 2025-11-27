import { User, Course, ActivityLogEntry } from '../types';
import { MOCK_USERS, MOCK_COURSES } from './mockData';

const STORAGE_KEYS = {
  USERS: 'lms_users',
  COURSES: 'lms_courses',
  LOGS: 'lms_logs',
  CURRENT_USER: 'lms_current_user'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const dataService = {
  async init(): Promise<{ users: User[], courses: Course[], logs: ActivityLogEntry[] }> {
    await delay(600);
    
    const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    const coursesRaw = localStorage.getItem(STORAGE_KEYS.COURSES);
    const logsRaw = localStorage.getItem(STORAGE_KEYS.LOGS);

    const users = usersRaw ? JSON.parse(usersRaw) : MOCK_USERS;
    const courses = coursesRaw ? JSON.parse(coursesRaw) : MOCK_COURSES;
    const logs = logsRaw ? JSON.parse(logsRaw) : [];

    if (!usersRaw) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    if (!coursesRaw) localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(MOCK_COURSES));

    return { users, courses, logs };
  },

  async saveUsers(users: User[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  async saveCourses(courses: Course[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  async saveLogs(logs: ActivityLogEntry[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  getCurrentUser(): User | null {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  },

  persistCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }
};