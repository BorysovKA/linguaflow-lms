import { useState, useEffect } from 'react';
import { AppSettings, User, ActionType, TargetType } from '../types';
import { dataService } from '../services/dataService';

export const useSettings = (
  initialSettings: AppSettings, 
  isLoading: boolean,
  logAction: (action: ActionType, targetType: TargetType, title: string) => void
) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  useEffect(() => {
    if (!isLoading) {
      dataService.saveSettings(settings);
    }
  }, [settings, isLoading]);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    logAction('update', 'settings', 'App Settings');
  };

  return {
    settings,
    setSettings,
    updateSettings
  };
};