
export type UserRole = 'admin' | 'methodist' | 'teacher' | 'student';

export type Language = 'en' | 'uk';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  allowedContent?: string[]; // IDs of Courses, Modules, or Lessons allowed
  groups?: string[]; // IDs of groups the user belongs to
}

export interface Group {
  id: string;
  name: string;
  studentIds: string[];
  allowedContent: string[];
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
  authorId?: string; // ID of the teacher who created it
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
  level: string;           
  targetAudience: string;  
  modules: CourseModule[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'rename' | 'publish' | 'access_grant';
export type TargetType = 'course' | 'module' | 'lesson' | 'settings' | 'group' | 'user';

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