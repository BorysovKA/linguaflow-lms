
import React, { useState } from 'react';
import { User, Language } from '../types';
import { Lock, User as UserIcon, ArrowRight, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay for better UX feel
    setTimeout(() => {
        const user = users.find(u => u.username === username);
        const isValidPassword = user?.password ? user.password === password : false;

        if (user && isValidPassword) {
          onLogin(user);
        } else {
          setError('Invalid credentials');
          setIsLoading(false);
        }
    }, 800);
  };

  const LangButton = ({ lang, label }: { lang: Language, label: string }) => (
    <button 
      type="button"
      onClick={() => setLanguage(lang)}
      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
          language === lang 
          ? 'bg-white text-brand-teal shadow-md transform scale-105' 
          : 'bg-white/40 text-slate-600 hover:bg-white/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Background Mesh */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-300/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-white/40 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-8 w-full max-w-[420px] relative z-10 transition-all duration-500 hover:shadow-teal-500/10">
        <div className="absolute top-6 right-6 flex gap-2">
            <LangButton lang="uk" label="UA" />
            <LangButton lang="en" label="EN" />
        </div>

        <div className="text-center mb-10 mt-6">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-teal-50 mx-auto mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300 relative">
             <TrendingUp size={40} className="text-brand-red" />
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-teal rounded-full border-2 border-white"></div>
          </div>
          <h1 className="text-3xl font-extrabold text-brand-teal tracking-tight">LEVEL UP</h1>
          <p className="text-brand-red font-bold text-sm tracking-widest uppercase mt-1">English School</p>
          <p className="text-slate-400 mt-4 text-sm font-medium">{t.loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
              <div className="bg-red-50/80 backdrop-blur text-red-500 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 animate-bounce-short">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  {error}
              </div>
          )}
          
          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-brand-teal">{t.username}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-teal">
                  <UserIcon size={20} />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-brand-teal outline-none transition-all duration-300 text-slate-900 font-medium placeholder:text-slate-300 hover:bg-white"
                placeholder={t.enterUsername}
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-brand-teal">{t.password}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-teal">
                  <Lock size={20} />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-brand-teal outline-none transition-all duration-300 text-slate-900 font-medium placeholder:text-slate-300 hover:bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-brand-teal active:scale-[0.98] transition-all duration-300 shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    {t.signIn}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium">Level Up LMS v2.0</p>
        </div>
      </div>
    </div>
  );
};
