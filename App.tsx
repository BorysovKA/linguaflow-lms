import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { UsersList } from './components/UsersList';
import { Curriculum } from './components/Curriculum';
import { AIArchitect } from './components/AIArchitect';
import { ActivityLog } from './components/ActivityLog';
import { User, Course, Lesson, CourseModule, ActivityLogEntry, ActionType, TargetType } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BookOpen, Layers, FileText, Loader2, Database, BarChart3 } from 'lucide-react';
import { dataService } from './services/dataService';

const MainApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('login'); 
  const { t } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const data = await dataService.init();
        setUsers(data.users);
        setCourses(data.courses);
        setActivityLog(data.logs);

        const savedUser = dataService.getCurrentUser();
        if (savedUser) {
           const validUser = data.users.find(u => u.id === savedUser.id);
           if (validUser) {
             setCurrentUser(validUser);
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

  useEffect(() => { 
    if (!isLoading) dataService.saveUsers(users); 
  }, [users, isLoading]);

  useEffect(() => { 
    if (!isLoading) dataService.saveCourses(courses); 
  }, [courses, isLoading]);

  useEffect(() => { 
    if (!isLoading) dataService.saveLogs(activityLog); 
  }, [activityLog, isLoading]);

  useEffect(() => {
      if (currentUser && currentPage !== 'login') {
          localStorage.setItem('lms_last_page', currentPage);
      }
  }, [currentPage, currentUser]);

  const [curriculumNavigation, setCurriculumNavigation] = useState<{
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  } | null>(null);

  const logAction = (
    user: User, 
    action: ActionType, 
    targetType: TargetType, 
    title: string, 
    details?: string,
    contextIds?: { courseId?: string, moduleId?: string, lessonId?: string }
  ) => {
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
  };

  const handleLogin = (u: User) => {
    setCurrentUser(u);
    dataService.persistCurrentUser(u);
    if (u.role === 'admin') setCurrentPage('users');
    else if (u.role === 'methodist') setCurrentPage('curriculum');
    else setCurrentPage('curriculum');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    dataService.persistCurrentUser(null);
    localStorage.removeItem('lms_last_page');
    setCurrentPage('login');
  };

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    const u: User = { ...newUser, id: Date.now().toString() };
    setUsers([...users, u]);
  };

  const handleUpdateUser = (id: string, updatedData: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updatedData } : u);
    setUsers(updatedUsers);
    if (currentUser && currentUser.id === id) {
        const updatedCurrent = { ...currentUser, ...updatedData };
        setCurrentUser(updatedCurrent);
        dataService.persistCurrentUser(updatedCurrent);
    }
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleUpdateLesson = (courseId: string, moduleId: string, updatedLesson: Lesson, description?: string) => {
    if (currentUser) {
        logAction(currentUser, 'update', 'lesson', updatedLesson.title, description || 'Content updated', { courseId, moduleId, lessonId: updatedLesson.id });
    }
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
      })
    }));
  };

  const handleAddLesson = (courseId: string, moduleId: string) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: t.newLessonTitle,
      durationMinutes: 45,
      status: 'draft',
      rating: 0,
      readiness: 0,
      blocks: []
    };
    
    if (currentUser) {
        logAction(currentUser, 'create', 'lesson', newLesson.title, undefined, { courseId, moduleId, lessonId: newLesson.id });
    }

    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: [...m.lessons, newLesson]
      })
    }));
  };

  const handleAddCourse = () => {
      const newCourse: Course = {
          id: Date.now().toString(),
          title: t.newCourseTitle,
          level: 'A1',
          targetAudience: 'adults',
          modules: []
      };
      if (currentUser) logAction(currentUser, 'create', 'course', newCourse.title, undefined, { courseId: newCourse.id });
      setCourses(prev => [...prev, newCourse]);
  };

  const handleAddModule = (courseId: string) => {
      const newModule: CourseModule = {
          id: Date.now().toString(),
          title: t.newModuleTitle,
          lessons: []
      };
      if (currentUser) logAction(currentUser, 'create', 'module', newModule.title, undefined, { courseId, moduleId: newModule.id });
      setCourses(prev => prev.map(c => c.id !== courseId ? c : {
          ...c,
          modules: [...c.modules, newModule]
      }));
  };

  const handleUpdateCourse = (id: string, title: string, level: Course['level'], audience: Course['targetAudience']) => {
    const course = courses.find(c => c.id === id);
    if (currentUser && course) logAction(currentUser, 'update', 'course', title, `Level: ${level}, Aud: ${audience}`, { courseId: id });
    setCourses(prev => prev.map(c => c.id !== id ? c : { ...c, title, level, targetAudience: audience }));
  };

  const handleRenameModule = (courseId: string, moduleId: string, newTitle: string) => {
    if (currentUser) logAction(currentUser, 'rename', 'module', newTitle, undefined, { courseId, moduleId });
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
        ...c,
        modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, title: newTitle })
    }));
  };

  const handleMoveCourse = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === courses.length - 1) return;
      
      const newCourses = [...courses];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      [newCourses[index], newCourses[swapIdx]] = [newCourses[swapIdx], newCourses[index]];
      
      setCourses(newCourses);
      if (currentUser) logAction(currentUser, 'move', 'course', newCourses[swapIdx].title);
  };

  const handleMoveModule = (courseId: string, index: number, direction: 'up' | 'down') => {
      setCourses(prev => prev.map(c => {
          if (c.id !== courseId) return c;
          if (direction === 'up' && index === 0) return c;
          if (direction === 'down' && index === c.modules.length - 1) return c;

          const newModules = [...c.modules];
          const swapIdx = direction === 'up' ? index - 1 : index + 1;
          [newModules[index], newModules[swapIdx]] = [newModules[swapIdx], newModules[index]];
          
          if (currentUser) logAction(currentUser, 'move', 'module', newModules[swapIdx].title, undefined, { courseId, moduleId: newModules[swapIdx].id });
          return { ...c, modules: newModules };
      }));
  };

  const handleMoveLesson = (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => {
      setCourses(prev => prev.map(c => {
          if (c.id !== courseId) return c;
          return {
              ...c,
              modules: c.modules.map(m => {
                  if (m.id !== moduleId) return m;
                  if (direction === 'up' && index === 0) return m;
                  if (direction === 'down' && index === m.lessons.length - 1) return m;

                  const newLessons = [...m.lessons];
                  const swapIdx = direction === 'up' ? index - 1 : index + 1;
                  [newLessons[index], newLessons[swapIdx]] = [newLessons[swapIdx], newLessons[index]];
                  
                  if (currentUser) logAction(currentUser, 'move', 'lesson', newLessons[swapIdx].title, undefined, { courseId, moduleId, lessonId: newLessons[swapIdx].id });
                  return { ...m, lessons: newLessons };
              })
          };
      }));
  };

  const handleDeleteCourse = (id: string) => {
      const c = courses.find(x => x.id === id);
      if (currentUser && c) logAction(currentUser, 'delete', 'course', c.title, undefined, { courseId: id });
      setCourses(prev => prev.filter(x => x.id !== id));
  };

  const handleDeleteModule = (courseId: string, moduleId: string) => {
      if (currentUser) logAction(currentUser, 'delete', 'module', 'Module', undefined, { courseId, moduleId });
      setCourses(prev => prev.map(c => c.id !== courseId ? c : {
          ...c,
          modules: c.modules.filter(m => m.id !== moduleId)
      }));
  };

  const handleDeleteLesson = (courseId: string, moduleId: string, lessonId: string) => {
       if (currentUser) logAction(currentUser, 'delete', 'lesson', 'Lesson', undefined, { courseId, moduleId, lessonId });
       setCourses(prev => prev.map(c => c.id !== courseId ? c : {
          ...c,
          modules: c.modules.map(m => m.id !== moduleId ? m : {
              ...m,
              lessons: m.lessons.filter(l => l.id !== lessonId)
          })
      }));
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

  if (!currentUser || currentPage === 'login') {
    return <Login onLogin={handleLogin} users={users} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">{t.welcomeBack}, {currentUser.name}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500">{t.activeCourses}</p>
                    <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Layers size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500">{t.totalModules}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {courses.reduce((acc, c) => acc + c.modules.length, 0)}
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
                      {courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {['admin', 'methodist'].includes(currentUser.role) && (
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
                             <BookOpen size={150} />
                        </div>
                     </div>
                </div>
            )}
          </div>
        );
      case 'users':
        return (
          <UsersList 
            users={users} 
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser} 
          />
        );
      case 'curriculum':
        return (
          <Curriculum 
            courses={courses} 
            userRole={currentUser.role}
            initialSelection={curriculumNavigation}
            onUpdateLesson={handleUpdateLesson}
            onAddLesson={handleAddLesson}
            onAddCourse={handleAddCourse}
            onAddModule={handleAddModule}
            onMoveCourse={handleMoveCourse}
            onMoveModule={handleMoveModule}
            onMoveLesson={handleMoveLesson}
            onUpdateCourse={handleUpdateCourse}
            onRenameModule={handleRenameModule}
            onDeleteCourse={handleDeleteCourse}
            onDeleteModule={handleDeleteModule}
            onDeleteLesson={handleDeleteLesson}
          />
        );
      case 'architect':
        return <AIArchitect />;
      case 'activity':
        return (
            <ActivityLog 
                logs={activityLog} 
                users={users} 
                onNavigate={(ctx) => {
                    setCurriculumNavigation(ctx);
                    setCurrentPage('curriculum');
                }}
            />
        );
      case 'my-classes':
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChart3 size={64} className="mb-4 text-slate-200" />
                <h2 className="text-xl font-bold text-slate-600">{t.comingSoon}</h2>
            </div>
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      currentPage={currentPage}
      onNavigate={(page) => {
          setCurriculumNavigation(null);
          setCurrentPage(page);
      }}
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