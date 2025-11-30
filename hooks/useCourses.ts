
import { useState, useEffect } from 'react';
import { Course, Lesson, CourseModule, User, ActionType, TargetType } from '../types';
import { dataService } from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';

export const useCourses = (
  initialCourses: Course[], 
  isLoading: boolean,
  currentUser: User | null,
  logAction: (user: User | null, action: ActionType, targetType: TargetType, title: string, details?: string, context?: any) => void
) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading) {
      dataService.saveCourses(courses);
    }
  }, [courses, isLoading]);

  // --- Lessons ---

  const updateLesson = (courseId: string, moduleId: string, updatedLesson: Lesson, description?: string) => {
    logAction(currentUser, 'update', 'lesson', updatedLesson.title, description || 'Content updated', { courseId, moduleId, lessonId: updatedLesson.id });
    
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
      })
    }));
  };

  const publishLesson = (courseId: string, moduleId: string, lessonId: string, isPublished: boolean) => {
     logAction(currentUser, 'publish', 'lesson', isPublished ? 'Published' : 'Unpublished', undefined, { courseId, moduleId, lessonId });
     setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: m.lessons.map(l => l.id !== lessonId ? l : { ...l, status: isPublished ? 'published' : 'draft' })
      })
    }));
  };

  const renameLesson = (courseId: string, moduleId: string, lessonId: string, newTitle: string) => {
    logAction(currentUser, 'rename', 'lesson', newTitle, undefined, { courseId, moduleId, lessonId });
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
        ...c,
        modules: c.modules.map(m => m.id !== moduleId ? m : {
            ...m,
            lessons: m.lessons.map(l => l.id !== lessonId ? l : { ...l, title: newTitle })
        })
    }));
  };

  const addLesson = (courseId: string, moduleId: string) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: t.newLessonTitle,
      durationMinutes: 45,
      status: 'draft',
      authorId: currentUser?.id,
      rating: 0,
      readiness: 0,
      blocks: []
    };
    
    logAction(currentUser, 'create', 'lesson', newLesson.title, undefined, { courseId, moduleId, lessonId: newLesson.id });

    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: [...m.lessons, newLesson]
      })
    }));
  };

  const moveLesson = (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => {
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
                
                logAction(currentUser, 'move', 'lesson', newLessons[swapIdx].title, undefined, { courseId, moduleId, lessonId: newLessons[swapIdx].id });
                return { ...m, lessons: newLessons };
            })
        };
    }));
  };

  // Soft delete for teachers, hard delete for admins (when force=true)
  const deleteLesson = (courseId: string, moduleId: string, lessonId: string, force: boolean = false) => {
    if (force) {
        // Hard Delete
        logAction(currentUser, 'delete', 'lesson', 'Lesson', undefined, { courseId, moduleId, lessonId });
        setCourses(prev => prev.map(c => c.id !== courseId ? c : {
           ...c,
           modules: c.modules.map(m => m.id !== moduleId ? m : {
               ...m,
               lessons: m.lessons.filter(l => l.id !== lessonId)
           })
       }));
    } else {
        // Soft Delete (Mark as pending)
        logAction(currentUser, 'delete', 'lesson', 'Lesson (Pending)', 'Requested deletion', { courseId, moduleId, lessonId });
        setCourses(prev => prev.map(c => c.id !== courseId ? c : {
            ...c,
            modules: c.modules.map(m => m.id !== moduleId ? m : {
                ...m,
                lessons: m.lessons.map(l => l.id !== lessonId ? l : { 
                    ...l, 
                    status: 'pending_deletion',
                    deletedBy: currentUser?.id
                })
            })
        }));
    }
  };

  const restoreLesson = (courseId: string, moduleId: string, lessonId: string) => {
      logAction(currentUser, 'restore', 'lesson', 'Lesson', 'Restored from pending deletion', { courseId, moduleId, lessonId });
      setCourses(prev => prev.map(c => c.id !== courseId ? c : {
          ...c,
          modules: c.modules.map(m => m.id !== moduleId ? m : {
              ...m,
              lessons: m.lessons.map(l => l.id !== lessonId ? l : { 
                  ...l, 
                  status: 'draft', // Revert to draft
                  deletedBy: undefined
              })
          })
      }));
  };

  // --- Modules ---

  const addModule = (courseId: string) => {
    const newModule: CourseModule = {
        id: Date.now().toString(),
        title: t.newModuleTitle,
        lessons: []
    };
    logAction(currentUser, 'create', 'module', newModule.title, undefined, { courseId, moduleId: newModule.id });
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
        ...c,
        modules: [...c.modules, newModule]
    }));
  };

  const renameModule = (courseId: string, moduleId: string, newTitle: string) => {
    logAction(currentUser, 'rename', 'module', newTitle, undefined, { courseId, moduleId });
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
        ...c,
        modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, title: newTitle })
    }));
  };

  const moveModule = (courseId: string, index: number, direction: 'up' | 'down') => {
    setCourses(prev => prev.map(c => {
        if (c.id !== courseId) return c;
        if (direction === 'up' && index === 0) return c;
        if (direction === 'down' && index === c.modules.length - 1) return c;

        const newModules = [...c.modules];
        const swapIdx = direction === 'up' ? index - 1 : index + 1;
        [newModules[index], newModules[swapIdx]] = [newModules[swapIdx], newModules[index]];
        
        logAction(currentUser, 'move', 'module', newModules[swapIdx].title, undefined, { courseId, moduleId: newModules[swapIdx].id });
        return { ...c, modules: newModules };
    }));
  };

  const deleteModule = (courseId: string, moduleId: string) => {
    logAction(currentUser, 'delete', 'module', 'Module', undefined, { courseId, moduleId });
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
        ...c,
        modules: c.modules.filter(m => m.id !== moduleId)
    }));
  };

  // --- Courses ---

  const addCourse = (defaultLevel: string, defaultAudience: string) => {
    const newCourse: Course = {
        id: Date.now().toString(),
        title: t.newCourseTitle,
        level: defaultLevel,
        targetAudience: defaultAudience,
        modules: []
    };
    logAction(currentUser, 'create', 'course', newCourse.title, undefined, { courseId: newCourse.id });
    setCourses(prev => [...prev, newCourse]);
  };

  const updateCourse = (id: string, title: string, level: string, audience: string) => {
    logAction(currentUser, 'update', 'course', title, `Level: ${level}, Aud: ${audience}`, { courseId: id });
    setCourses(prev => prev.map(c => c.id !== id ? c : { ...c, title, level, targetAudience: audience }));
  };

  const moveCourse = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === courses.length - 1) return;
    
    const newCourses = [...courses];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [newCourses[index], newCourses[swapIdx]] = [newCourses[swapIdx], newCourses[index]];
    
    setCourses(newCourses);
    logAction(currentUser, 'move', 'course', newCourses[swapIdx].title);
  };

  const deleteCourse = (id: string) => {
    const c = courses.find(x => x.id === id);
    if (c) logAction(currentUser, 'delete', 'course', c.title, undefined, { courseId: id });
    setCourses(prev => prev.filter(x => x.id !== id));
  };

  return {
    courses,
    setCourses,
    addLesson,
    updateLesson,
    renameLesson,
    deleteLesson,
    restoreLesson,
    moveLesson,
    addModule,
    renameModule,
    deleteModule,
    moveModule,
    addCourse,
    updateCourse,
    deleteCourse,
    moveCourse,
    publishLesson
  };
};