
import React from 'react';
import { User, UserRole, Language } from '../types';
import { LogOut, BookOpen, Users, LayoutDashboard, Sparkles, GraduationCap, Activity, Database, WifiOff, Settings, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  isDbConnected: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPage, onNavigate, isDbConnected }) => {
  const { t, language, setLanguage } = useLanguage();
  
  const NavItem = ({ id, label, icon: Icon, roles }: { id: string, label: string, icon: any, roles: UserRole[] }) => {
    if (!roles.includes(user.role)) return null;
    return (
      <button
        onClick={() => onNavigate(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
          currentPage === id 
            ? 'bg-indigo-600 text-white shadow-md' 
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  const LangButton = ({ lang, label }: { lang: Language, label: string }) => (
    <button 
      onClick={() => setLanguage(lang)}
      className={`px-2 py-1 text-xs font-bold rounded ${language === lang ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="text-xl font-bold text-slate-800">LinguaFlow</span>
          </div>
          <div className="flex gap-2 justify-center">
            <LangButton lang="uk" label="UA" />
            <LangButton lang="en" label="EN" />
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.menu}</p>
            <NavItem id="dashboard" label={t.dashboard} icon={LayoutDashboard} roles={['admin', 'methodist', 'teacher', 'student']} />
            <NavItem id="activity" label={t.activityLog} icon={Activity} roles={['admin', 'methodist']} />
            <NavItem id="users" label={t.users} icon={Users} roles={['admin']} />
            <NavItem id="access" label={t.accessControl} icon={ShieldCheck} roles={['admin', 'methodist']} />
            <NavItem id="curriculum" label={t.curriculum} icon={BookOpen} roles={['admin', 'methodist', 'teacher']} />
            <NavItem id="my-classes" label={t.myClasses} icon={GraduationCap} roles={['teacher', 'student']} />
          </div>

          <div>
             <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.planning}</p>
             <NavItem id="architect" label={t.aiArchitect} icon={Sparkles} roles={['admin', 'methodist']} />
             <NavItem id="settings" label={t.settings} icon={Settings} roles={['admin']} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
           {/* DB Status Indicator */}
           <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
             isDbConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
           }`}>
             {isDbConnected ? <Database size={14} /> : <WifiOff size={14} />}
             <span>{isDbConnected ? 'DB Connected' : 'Demo / Offline'}</span>
           </div>

          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{t.roles[user.role] || user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut size={16} />
            {t.signOut}
          </button>
          <div className="text-[10px] text-slate-300 text-center mt-2">v1.5 Groups & Access</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50 relative">
        <div className="w-full h-full p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};