import React, { useState } from 'react';
import { User, Language } from '../types';
import { Lock, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username);
    const isValidPassword = user?.password ? user.password === password : password.length > 0;

    if (user && isValidPassword) {
      onLogin(user);
    } else {
      setError('Invalid credentials (try password: 123)');
    }
  };

  const prefill = (role: string) => {
    const u = users.find(u => u.role === role);
    if(u) {
      setUsername(u.username);
      setPassword(u.password || '123');
    }
  };

  const LangButton = ({ lang, label }: { lang: Language, label: string }) => (
    <button 
      type="button"
      onClick={() => setLanguage(lang)}
      className={`px-3 py-1 text-sm font-bold rounded-full transition-colors border ${language === lang ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        <div className="absolute top-4 right-4 flex gap-2">
            <LangButton lang="en" label="EN" />
            <LangButton lang="ru" label="RU" />
            <LangButton lang="uk" label="UA" />
        </div>

        <div className="text-center mb-8 mt-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">L</div>
          <h1 className="text-2xl font-bold text-slate-900">{t.loginTitle}</h1>
          <p className="text-slate-500 mt-2">{t.loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.username}</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
                placeholder={t.enterUsername}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            {t.signIn}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400 text-center mb-3">{t.quickLogin}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['admin', 'methodist', 'teacher', 'student'].map(role => (
              <button 
                key={role}
                onClick={() => prefill(role)}
                className="text-xs px-3 py-1 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-full border border-slate-200 transition-colors capitalize"
              >
                {t.roles[role as keyof typeof t.roles] || role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};