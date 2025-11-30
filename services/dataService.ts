import { User, Course, ActivityLogEntry } from '../types';
import { supabase } from './supabaseClient.ts';

export const dataService = {
  async init(): Promise<{ users: User[], courses: Course[], logs: ActivityLogEntry[], isConnected: boolean }> {
    try {
      console.log("Attempting to connect to Supabase...");
      
      // Fetch Users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) {
        console.error("Supabase Users Error:", usersError.message);
        throw usersError;
      }

      // Fetch Courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*');

      if (coursesError) {
        console.error("Supabase Courses Error:", coursesError.message);
        throw coursesError;
      }

      // Fetch Logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      console.log("Successfully loaded data from Supabase.");
      return { 
        users: usersData || [], 
        courses: coursesData || [], 
        logs: logsData || [],
        isConnected: true
      };

    } catch (e) {
      console.error("Critical: Failed to load data from Supabase.", e);
      // Return empty state on error, forcing the user to fix the DB or connection
      return { users: [], courses: [], logs: [], isConnected: false };
    }
  },

  async saveUsers(users: User[]): Promise<void> {
    if (users.length === 0) return;
    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error("Error saving users to DB:", error.message);
  },

  async saveCourses(courses: Course[]): Promise<void> {
    if (courses.length === 0) return;
    
    const payload = courses.map(c => ({
      id: c.id,
      title: c.title,
      level: c.level,
      targetAudience: c.targetAudience, 
      modules: c.modules 
    }));
    
    const { error } = await supabase.from('courses').upsert(payload);
    if (error) console.error("Error saving courses to DB:", error.message);
  },

  async saveLogs(logs: ActivityLogEntry[]): Promise<void> {
    if (logs.length === 0) return;
    
    const recentLogs = logs.slice(0, 5).map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        targetType: log.targetType,
        targetTitle: log.targetTitle,
        details: log.details,
        timestamp: log.timestamp,
        contextIds: log.contextIds 
    }));
    
    const { error } = await supabase.from('activity_logs').upsert(recentLogs);
    if (error) console.error("Error saving logs to DB:", error.message);
  },

  getCurrentUser(): User | null {
    const saved = localStorage.getItem('lms_current_user');
    return saved ? JSON.parse(saved) : null;
  },

  persistCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem('lms_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lms_current_user');
    }
  }
};