
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Plus, Trash2, Save, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const { t } = useLanguage();
  const [newLevel, setNewLevel] = useState('');
  const [newAudience, setNewAudience] = useState('');

  const handleAddLevel = () => {
    if (!newLevel.trim()) return;
    onUpdateSettings({
      ...settings,
      levels: [...settings.levels, newLevel.trim()]
    });
    setNewLevel('');
  };

  const handleDeleteLevel = (index: number) => {
    const newLevels = settings.levels.filter((_, i) => i !== index);
    onUpdateSettings({ ...settings, levels: newLevels });
  };

  const handleAddAudience = () => {
    if (!newAudience.trim()) return;
    onUpdateSettings({
      ...settings,
      targetAudiences: [...settings.targetAudiences, newAudience.trim()]
    });
    setNewAudience('');
  };

  const handleDeleteAudience = (index: number) => {
    const newAudiences = settings.targetAudiences.filter((_, i) => i !== index);
    onUpdateSettings({ ...settings, targetAudiences: newAudiences });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.settings}</h2>
          <p className="text-slate-500">{t.manageConfig}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Levels Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><SettingsIcon size={18} /></div>
             {t.courseLevels}
          </h3>
          
          <div className="space-y-3 mb-6">
            {settings.levels.map((level, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                <span className="font-medium text-slate-700">{level}</span>
                <button 
                  onClick={() => handleDeleteLevel(idx)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {settings.levels.length === 0 && <p className="text-slate-400 text-sm text-center py-4">{t.noData}</p>}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              placeholder={t.addLevelPlaceholder}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button 
              onClick={handleAddLevel}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Audience Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><SettingsIcon size={18} /></div>
             {t.studentTypes}
          </h3>
          
          <div className="space-y-3 mb-6">
            {settings.targetAudiences.map((aud, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                <span className="font-medium text-slate-700">{aud}</span>
                <button 
                  onClick={() => handleDeleteAudience(idx)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
             {settings.targetAudiences.length === 0 && <p className="text-slate-400 text-sm text-center py-4">{t.noData}</p>}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder={t.addAudiencePlaceholder}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAudience()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button 
              onClick={handleAddAudience}
              className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
