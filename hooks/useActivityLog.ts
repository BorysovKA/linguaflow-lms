import { useState, useEffect, useCallback } from 'react';
import { ActivityLogEntry, User, ActionType, TargetType } from '../types';
import { dataService } from '../services/dataService';

export const useActivityLog = (initialLogs: ActivityLogEntry[], isLoading: boolean) => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialLogs);

  useEffect(() => {
    if (!isLoading) {
      dataService.saveLogs(activityLog);
    }
  }, [activityLog, isLoading]);

  const logAction = useCallback((
    user: User | null,
    action: ActionType,
    targetType: TargetType,
    title: string,
    details?: string,
    contextIds?: { courseId?: string, moduleId?: string, lessonId?: string }
  ) => {
    if (!user) return;

    const entry: ActivityLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      action,
      targetType,
      targetTitle: title,
      details,
      timestamp: Date.now(),
      contextIds
    };
    
    setActivityLog(prev => [entry, ...prev]);
  }, []);

  return {
    activityLog,
    setActivityLog,
    logAction
  };
};