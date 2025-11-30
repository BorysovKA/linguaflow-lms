
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { UsersList } from './components/UsersList';
import { Curriculum } from './components/Curriculum';
import { StudentClasses } from './components/StudentClasses';
import { Settings } from './components/Settings';
import { Dashboard } from './components/Dashboard';
import { AccessControl } from './components/AccessControl';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Loader2, Database } from 'lucide-react';
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

  // Helper to get current user groups
  const currentUserGroups = useMemo(() => {
      if (!auth.currentUser || !auth.currentUser.groups) return [];
      return users.groups.filter(g => auth.currentUser?.groups?.includes(g.id));
  }, [auth.currentUser, users.groups]);

  // Filter courses for StudentClasses view based on access permissions
  const availableCoursesForStudent = useMemo(() => {
      if (!auth.currentUser) return [];
      const userAllowed = auth.currentUser.allowedContent || [];
      const groupsAllowed = currentUserGroups.flatMap(g => g.allowedContent);
      const allAllowed = [...userAllowed, ...groupsAllowed];
      
      return courses.courses.filter(c => allAllowed.includes(c.id));
  }, [courses.courses, auth.currentUser, currentUserGroups]);

  // Handle Restoration logic: Restore lesson AND deny access to the user who deleted it
  const handleRestoreLesson = (courseId: string, moduleId: string, lessonId: string, deletedBy?: string) => {
      // 1. Restore the lesson in the course structure
      courses.restoreLesson(courseId, moduleId, lessonId);

      // 2. If we know who deleted it, deny them future access
      if (deletedBy) {
          users.denyUserAccess(deletedBy, lessonId);
          // Log this specific denial logic is handled inside denyUserAccess or we can log it separately if needed
          // The restoreLesson already logs the restore action
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

  // We safely assume currentUser is defined here due to the guard clause above.
  const currentUser = auth.currentUser;

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            user={currentUser}
            courses={courses.courses}
            logs={activity.activityLog}
            onNavigate={setCurrentPage}
          />
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
      case 'access':
          return (
              <AccessControl 
                  users={users.users}
                  groups={users.groups}
                  courses={courses.courses}
                  onUpdateUserAccess={users.updateUserAccess}
                  onUpdateGroupAccess={users.updateGroupAccess}
                  onCreateGroup={users.createGroup}
                  onDeleteGroup={users.deleteGroup}
                  onUpdateGroupMembers={users.updateGroupMembers}
              />
          );
      case 'curriculum':
        return (
          <Curriculum 
            courses={courses.courses} 
            userRole={currentUser.role}
            user={currentUser}
            userGroups={currentUserGroups}
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
            onRenameLesson={courses.renameLesson}
            onDeleteCourse={courses.deleteCourse}
            onDeleteModule={courses.deleteModule}
            onDeleteLesson={courses.deleteLesson}
            onRestoreLesson={handleRestoreLesson}
            onPublishLesson={courses.publishLesson}
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
                courses={availableCoursesForStudent}
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
      user={currentUser} 
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
