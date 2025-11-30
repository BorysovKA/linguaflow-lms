
export type UserRole = 'admin' | 'methodist' | 'teacher' | 'student';

export type Language = 'en' | 'uk';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  QUIZ = 'quiz',
  NOTE = 'note'
}

export interface ContentBlock {
  id: string;
  type: ContentType;
  content: string;
  metadata?: any;
}

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  blocks: ContentBlock[];
  status: 'draft' | 'published';
  rating?: number;
  readiness?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  level: string;           // Changed from union to string to allow custom levels
  targetAudience: string;  // Changed from union to string to allow custom audiences
  modules: CourseModule[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'rename';
export type TargetType = 'course' | 'module' | 'lesson' | 'settings';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: ActionType;
  targetType: TargetType;
  targetTitle: string;
  details?: string;
  timestamp: number;
  contextIds?: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  };
}

export interface AppSettings {
  levels: string[];
  targetAudiences: string[];
}
