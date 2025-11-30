
import React, { useMemo } from 'react';
import { User, Course, ActivityLogEntry } from '../types';
import { BookOpen, Layers, FileText, Sparkles, TrendingUp, ArrowRight, Star } from 'lucide-react';
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

  // Generate chart data
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

    const maxCount = Math.max(...data.map(d => d.count), 5); 
    return { data, maxCount };
  }, [logs]);

  const StatCard = ({ title, value, icon: Icon, colorClass, delay }: any) => (
      <div 
        className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100/50 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
        style={{ animationDelay: `${delay}ms` }}
      >
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
          <div className="flex items-center justify-between mb-4">
              <div className={`p-3.5 rounded-2xl ${colorClass.replace('text-', 'bg-').replace('600', '100')} ${colorClass}`}>
                  <Icon size={24} />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <TrendingUp size={12} /> +12%
              </span>
          </div>
          <div>
              <p className="text-slate-500 font-medium text-sm mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          </div>
      </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 shadow-2xl shadow-slate-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold mb-2">{t.welcomeBack}, {user.name}! 👋</h1>
                <p className="text-slate-300 max-w-lg">Ready to continue managing your language curriculum? You have <strong className="text-white">{courses.length} active courses</strong> today.</p>
             </div>
             {user.role === 'admin' && (
                 <button onClick={() => onNavigate('settings')} className="hidden md:flex bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-white/10">
                    Manage Platform
                 </button>
             )}
          </div>
      </div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={t.activeCourses} value={courses.length} icon={BookOpen} colorClass="text-indigo-600" delay={100} />
        <StatCard title={t.totalModules} value={stats.totalModules} icon={Layers} colorClass="text-emerald-600" delay={200} />
        <StatCard title={t.totalLessons} value={stats.totalLessons} icon={FileText} colorClass="text-amber-600" delay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100/50">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <TrendingUp size={20} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Weekly Activity</h3>
                </div>
                <select className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer hover:bg-slate-100">
                    <option>Last 7 Days</option>
                    <option>Last Month</option>
                </select>
             </div>
             
             <div className="h-60 flex items-end justify-between gap-4 px-2">
                {chartData.data.map((day, idx) => {
                    const heightPercent = (day.count / chartData.maxCount) * 100;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div className="w-full relative px-1 md:px-2 h-full flex items-end">
                                <div 
                                    className="w-full bg-slate-100 rounded-t-2xl transition-all duration-500 relative group-hover:bg-indigo-100 overflow-hidden"
                                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                        {day.count} Actions
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-slate-400 mt-3 font-semibold tracking-wide">{day.displayDate}</span>
                        </div>
                    );
                })}
             </div>
          </div>

          {/* AI Promo Card - Premium Look */}
          {['admin', 'methodist'].includes(user.role) && (
             <div 
                className="bg-white p-1 rounded-[2rem] shadow-sm border border-slate-100/50 h-full group cursor-pointer" 
                onClick={() => onNavigate('architect')}
             >
                <div className="bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#ec4899] rounded-[1.8rem] h-full p-8 text-white relative overflow-hidden flex flex-col justify-between transition-transform duration-500 group-hover:scale-[0.98]">
                    {/* Animated Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>
                    
                    <div className="relative z-10">
                        <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/20 group-hover:rotate-12 transition-transform duration-300">
                            <Sparkles size={28} className="text-white drop-shadow-md" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{t.buildFuture}</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed font-medium opacity-90">{t.aiConsultantDesc}</p>
                    </div>

                    <div className="relative z-10 mt-6">
                        <button className="w-full bg-white text-indigo-600 px-6 py-4 rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all flex items-center justify-between group-hover:translate-x-1">
                            {t.openAiConsultant}
                            <ArrowRight size={18} className="text-indigo-400" />
                        </button>
                    </div>
                </div>
             </div>
          )}
      </div>

      {/* Quick Actions / Recent (Placeholder for future) */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100/50">
          <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-800">Recent Updates</h3>
              <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
          </div>
          <div className="space-y-4">
              {logs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-md transition-all">
                          {log.action === 'create' ? <Sparkles size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">{log.targetTitle}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{t.actionTypes[log.action as keyof typeof t.actionTypes]} by <span className="text-slate-700 font-medium">{log.userName}</span></p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
              ))}
              {logs.length === 0 && <p className="text-slate-400 text-center py-4">No recent activity.</p>}
          </div>
      </div>
    </div>
  );
};
