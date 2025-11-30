import React, { useState, useEffect, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { UsersList } from './components/UsersList';
import { Curriculum } from './components/Curriculum';
import { StudentClasses } from './components/StudentClasses';
import { Settings } from './components/Settings';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BookOpen, Layers, FileText, Loader2, Database, Sparkles } from 'lucide-react';
import { dataService } from './services/dataService';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useActivityLog } from './hooks/useActivityLog';
import { useUsers } from './hooks/useUsers';
import { useCourses } from './hooks/useCourses';

// Lazy load heavy components
const AIArchitect = React.lazy(() => import('./components/AIArchitect').then(module => ({ default: module.AIArchitect })));
const ActivityLog = React.lazy(() => import('./components/ActivityLog').then(module => ({ default: module.ActivityLog })));

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('login'); 
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [curriculumNavigation, setCurriculumNavigation] = useState<{
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  } | null>(null);

  // 1. Initialize State via Hooks (initially empty)
  const auth = useAuth(null);
  const activity = useActivityLog([], isLoading);
  const settings = useSettings({ levels: [], targetAudiences: [] }, isLoading, (a, t, ti) => activity.logAction(auth.currentUser, a, t, ti));
  const users = useUsers([], isLoading, auth.currentUser, auth.updateCurrentUser);
  const courses = useCourses([], isLoading, auth.currentUser, activity.logAction);

  // 2. Fetch Initial Data
  useEffect(() => {
    const initApp = async () => {
      try {
        const data = await dataService.init();
        
        // Hydrate hooks
        users.setUsers(data.users);
        courses.setCourses(data.courses);
        activity.setActivityLog(data.logs);
        settings.setSettings(data.settings);
        setIsDbConnected(data.isConnected);

        // Check for persisted session
        const savedUser = dataService.getCurrentUser();
        if (savedUser) {
           const validUser = data.users.find(u => u.id === savedUser.id);
           if (validUser) {
             auth.setCurrentUser(validUser);
             const lastPage = localStorage.getItem('lms_last_page');
             setCurrentPage(lastPage || 'dashboard');
           }
        }
      } catch (e) {
        console.error("Failed to initialize app:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // 3. Navigation persistence
  useEffect(() => {
      if (auth.currentUser && currentPage !== 'login') {
          localStorage.setItem('lms_last_page', currentPage);
      }
  }, [currentPage, auth.currentUser]);

  // 4. Handlers
  const handleLoginWrapper = (u: any) => {
    auth.login(u);
    if (u.role === 'admin') setCurrentPage('users');
    else if (u.role === 'methodist') setCurrentPage('curriculum');
    else if (u.role === 'student' || u.role === 'teacher') setCurrentPage('my-classes');
    else setCurrentPage('curriculum');
  };

  const handleLogoutWrapper = () => {
    auth.logout();
    localStorage.removeItem('lms_last_page');
    setCurrentPage('login');
  };

  const handleNavigateToCourse = (courseId: string) => {
    const course = courses.courses.find(c => c.id === courseId);
    if (course) {
        const firstModule = course.modules[0];
        const firstLesson = firstModule?.lessons[0];
        setCurriculumNavigation({
            courseId,
            moduleId: firstModule?.id,
            lessonId: firstLesson?.id
        });
        setCurrentPage('curriculum');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="flex items-center gap-2 text-sm font-medium">
          <Database size={16} />
          Connecting to data source...
        </div>
      </div>
    );
  }

  if (!auth.currentUser || currentPage === 'login') {
    return <Login onLogin={handleLoginWrapper} users={users.users} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">{t.welcomeBack}, {auth.currentUser.name}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500">{t.activeCourses}</p>
                    <p className="text-2xl font-bold text-slate-900">{courses.courses.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Layers size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500">{t.totalModules}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {courses.courses.reduce((acc, c) => acc + c.modules.length, 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><FileText size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500">{t.totalLessons}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {courses.courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {['admin', 'methodist'].includes(auth.currentUser.role) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                     <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-8 text-white shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setCurrentPage('architect')}>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">{t.buildFuture}</h3>
                            <p className="text-indigo-100 mb-4 text-sm max-w-xs">{t.aiConsultantDesc}</p>
                            <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors">
                                {t.openAiConsultant}
                            </button>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 group-hover:scale-110 transition-transform">
                             <Sparkles size={150} />
                        </div>
                     </div>
                </div>
            )}
          </div>
        );
      case 'users':
        return (
          <UsersList 
            users={users.users} 
            onAddUser={users.addUser} 
            onUpdateUser={users.updateUser} 
            onDeleteUser={users.deleteUser} 
          />
        );
      case 'curriculum':
        return (
          <Curriculum 
            courses={courses.courses} 
            userRole={auth.currentUser.role}
            levels={settings.settings.levels}
            audiences={settings.settings.targetAudiences}
            initialSelection={curriculumNavigation}
            onUpdateLesson={courses.updateLesson}
            onAddLesson={courses.addLesson}
            onAddCourse={() => courses.addCourse(settings.settings.levels[0] || 'A1', settings.settings.targetAudiences[0] || 'General')}
            onAddModule={courses.addModule}
            onMoveCourse={courses.moveCourse}
            onMoveModule={courses.moveModule}
            onMoveLesson={courses.moveLesson}
            onUpdateCourse={courses.updateCourse}
            onRenameModule={courses.renameModule}
            onDeleteCourse={courses.deleteCourse}
            onDeleteModule={courses.deleteModule}
            onDeleteLesson={courses.deleteLesson}
          />
        );
      case 'architect':
        return (
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>}>
                <AIArchitect />
            </Suspense>
        );
      case 'activity':
        return (
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>}>
                <ActivityLog 
                    logs={activity.activityLog} 
                    users={users.users} 
                    onNavigate={(ctx) => {
                        setCurriculumNavigation(ctx);
                        setCurrentPage('curriculum');
                    }}
                />
            </Suspense>
        );
      case 'my-classes':
        return (
            <StudentClasses 
                courses={courses.courses}
                onNavigateToCourse={handleNavigateToCourse}
            />
        );
      case 'settings':
        return (
            <Settings 
                settings={settings.settings} 
                onUpdateSettings={settings.updateSettings}
            />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <Layout 
      user={auth.currentUser} 
      onLogout={handleLogoutWrapper} 
      currentPage={currentPage}
      onNavigate={(page) => {
          setCurriculumNavigation(null);
          setCurrentPage(page);
      }}
      isDbConnected={isDbConnected}
    >
      {renderContent()}
    </Layout>
  );
};

const App = () => (
    <LanguageProvider>
        <MainApp />
    </LanguageProvider>
);

export default App;