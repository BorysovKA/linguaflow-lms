import React, { useMemo } from 'react';
import { User, Course, ActivityLogEntry } from '../types';
import { BookOpen, Layers, FileText, Sparkles, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  user: User;
  courses: Course[];
  logs: ActivityLogEntry[];
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, courses, logs, onNavigate }) => {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const totalModules = courses.reduce((acc, c) => acc + c.modules.length, 0);
    const totalLessons = courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0);
    return { totalModules, totalLessons };
  }, [courses]);

  // Generate chart data: Count actions per day for the last 7 days
  const chartData = useMemo(() => {
    const days = 7;
    const data = new Array(days).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return {
            date: d.toISOString().split('T')[0],
            displayDate: d.toLocaleDateString(undefined, { weekday: 'short' }),
            count: 0
        };
    });

    logs.forEach(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        const dayStat = data.find(d => d.date === logDate);
        if (dayStat) dayStat.count++;
    });

    const maxCount = Math.max(...data.map(d => d.count), 5); // Minimum scale of 5
    return { data, maxCount };
  }, [logs]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">{t.welcomeBack}, {user.name}!</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={24} /></div>
            <div>
              <p className="text-sm text-slate-500">{t.activeCourses}</p>
              <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
           <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Layers size={24} /></div>
            <div>
              <p className="text-sm text-slate-500">{t.totalModules}</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalModules}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
           <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><FileText size={24} /></div>
            <div>
              <p className="text-sm text-slate-500">{t.totalLessons}</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalLessons}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <TrendingUp size={20} />
                </div>
                <h3 className="font-bold text-slate-800">Activity Overview (Last 7 Days)</h3>
             </div>
             
             <div className="h-48 flex items-end gap-2 sm:gap-4">
                {chartData.data.map((day, idx) => {
                    const heightPercent = (day.count / chartData.maxCount) * 100;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                                {day.count} actions on {day.date}
                            </div>
                            <div 
                                className="w-full bg-indigo-100 rounded-t-lg transition-all duration-500 relative group-hover:bg-indigo-200"
                                style={{ height: `${Math.max(heightPercent, 4)}%` }} // Min height for visual
                            >
                                <div 
                                    className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg transition-all duration-700"
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-400 mt-2 font-medium">{day.displayDate}</span>
                        </div>
                    );
                })}
             </div>
          </div>

          {/* AI Promo / Actions */}
          {['admin', 'methodist'].includes(user.role) && (
             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-8 text-white shadow-lg relative overflow-hidden group cursor-pointer flex flex-col justify-between" onClick={() => onNavigate('architect')}>
                <div className="relative z-10">
                    <div className="bg-white/10 w-fit p-2 rounded-lg mb-4 backdrop-blur-sm border border-white/20">
                        <Sparkles size={24} className="text-yellow-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t.buildFuture}</h3>
                    <p className="text-indigo-100 mb-6 text-sm leading-relaxed">{t.aiConsultantDesc}</p>
                </div>
                <button className="relative z-10 w-full bg-white text-indigo-600 px-4 py-3 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm">
                    {t.openAiConsultant}
                </button>
                <div className="absolute -right-4 -bottom-4 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                     <Sparkles size={200} />
                </div>
             </div>
          )}
      </div>
    </div>
  );
};