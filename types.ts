
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
  deniedContent?: string[]; // IDs explicitly blocked (even if parent is allowed)
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
  status: 'draft' | 'published' | 'pending_deletion';
  authorId?: string; // ID of the teacher who created it
  deletedBy?: string; // ID of the user who requested deletion
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
  color?: string; // Hex code or tailwind class for tile background
  icon?: string; // Icon name
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'rename' | 'publish' | 'access_grant' | 'restore' | 'access_deny' | 'copy';
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
