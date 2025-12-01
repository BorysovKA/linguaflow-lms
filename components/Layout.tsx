
import React from 'react';
import { User, UserRole, Language } from '../types';
import { LogOut, BookOpen, Users, LayoutDashboard, Sparkles, GraduationCap, Activity, Database, WifiOff, Settings, ShieldCheck, Search, Bell, TrendingUp, FlaskConical } from 'lucide-react';
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
    const isActive = currentPage === id;
    
    return (
      <button
        onClick={() => onNavigate(id)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 mb-1.5 group relative overflow-hidden ${
          isActive 
            ? 'bg-brand-teal text-white shadow-lg shadow-teal-600/20 font-medium' 
            : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
        }`}
      >
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
             <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className="font-medium tracking-wide text-sm">{label}</span>
        {isActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>
        )}
      </button>
    );
  };

  const LangButton = ({ lang, label }: { lang: Language, label: string }) => (
    <button 
      onClick={() => setLanguage(lang)}
      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
          language === lang 
          ? 'bg-white text-brand-teal shadow-sm' 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F2F2F7] overflow-hidden font-sans">
      {/* Floating Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] m-4 mr-0 rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 z-20">
        {/* Logo Area */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 font-bold shadow-sm border border-teal-100">
                <TrendingUp size={24} className="text-brand-red" />
            </div>
            <div>
                <span className="text-lg font-extrabold text-brand-teal tracking-tight block leading-tight">LEVEL UP</span>
                <span className="text-[10px] font-bold text-brand-red uppercase tracking-widest">English School</span>
            </div>
          </div>
          
          {/* User Card Mini */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-lg shadow-inner">
                  {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.roles[user.role] || user.role}</p>
              </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-6">
          <div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.menu}</p>
            <NavItem id="dashboard" label={t.dashboard} icon={LayoutDashboard} roles={['admin', 'methodist', 'teacher', 'student']} />
            <NavItem id="my-classes" label={t.myClasses} icon={GraduationCap} roles={['teacher', 'student']} />
            <NavItem id="curriculum" label={t.curriculum} icon={BookOpen} roles={['admin', 'methodist', 'teacher']} />
            <NavItem id="activity" label={t.activityLog} icon={Activity} roles={['admin', 'methodist']} />
          </div>

          {(user.role === 'admin' || user.role === 'methodist' || user.role === 'teacher') && (
              <div>
                 <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.planning}</p>
                 <NavItem id="architect" label={t.aiArchitect} icon={Sparkles} roles={['admin', 'methodist']} />
                 <NavItem id="test-builder" label={t.testBuilder} icon={FlaskConical} roles={['admin', 'methodist', 'teacher']} />
                 <NavItem id="users" label={t.users} icon={Users} roles={['admin', 'methodist']} />
                 <NavItem id="access" label={t.accessControl} icon={ShieldCheck} roles={['admin', 'methodist']} />
                 <NavItem id="settings" label={t.settings} icon={Settings} roles={['admin']} />
              </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 mt-auto">
           <div className="bg-slate-100/50 rounded-2xl p-1 mb-3 flex justify-between">
              <LangButton lang="uk" label="Українська" />
              <LangButton lang="en" label="English" />
           </div>
           
           <div className={`mb-3 px-4 py-2 rounded-xl text-xs font-medium flex items-center justify-between ${
             isDbConnected 
             ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
             : 'bg-amber-50 text-amber-700 border border-amber-100'
           }`}>
             <div className="flex items-center gap-2">
                 {isDbConnected ? <Database size={12} /> : <WifiOff size={12} />}
                 <span>{isDbConnected ? 'Online' : 'Demo Mode'}</span>
             </div>
             <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
           </div>

           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-all duration-300 group"
           >
             <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
             {t.signOut}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative">
         {/* Top Mobile Header (visible only on small screens) */}
         <div className="md:hidden h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center border border-teal-100">
                    <TrendingUp size={18} className="text-brand-red" />
                 </div>
                 <div className="flex flex-col leading-none">
                    <span className="font-extrabold text-brand-teal text-sm">LEVEL UP</span>
                    <span className="text-[8px] font-bold text-brand-red uppercase">English School</span>
                 </div>
            </div>
            <button onClick={onLogout}><LogOut size={20} className="text-slate-600" /></button>
         </div>

        <div className="h-full overflow-auto custom-scrollbar p-4 md:p-6 lg:p-8">
           {/* Header Area for Content */}
           <header className="mb-8 flex justify-between items-center">
               <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    {currentPage === 'dashboard' ? t.dashboard : 
                     currentPage === 'curriculum' ? t.curriculum :
                     currentPage === 'users' ? t.users :
                     currentPage === 'architect' ? t.aiArchitect :
                     currentPage === 'test-builder' ? t.testBuilder :
                     currentPage === 'my-classes' ? t.myClasses :
                     t.appTitle}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                      {new Date().toLocaleDateString(language === 'uk' ? 'uk-UA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                      <Search size={18} className="text-slate-400" />
                      <input type="text" placeholder={t.searchPlaceholder} className="bg-transparent border-none focus:outline-none text-sm w-40 placeholder:text-slate-400 text-slate-700" />
                  </div>
                  <button className="w-10 h-10 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-brand-teal hover:shadow-md transition-all relative">
                      <Bell size={20} />
                      <span className="absolute top-2 right-2.5 w-2 h-2 bg-brand-red rounded-full border border-white"></span>
                  </button>
               </div>
           </header>

           {/* Content Injection */}
           <div className="animate-fade-in-up">
              {children}
           </div>
        </div>
      </main>
    </div>
  );
};
