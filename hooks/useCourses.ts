
import { useState, useEffect } from 'react';
import { Course, Lesson, CourseModule, User, ActionType, TargetType } from '../types';
import { dataService } from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';

// Helper for array moving
const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
};

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
    logAction(currentUser, 'update', 'lesson', updatedLesson.title, description || t.logs.contentUpdated, { courseId, moduleId, lessonId: updatedLesson.id });
    
    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l)
      })
    }));
  };

  const publishLesson = (courseId: string, moduleId: string, lessonId: string, isPublished: boolean) => {
     logAction(currentUser, 'publish', 'lesson', isPublished ? t.logs.published : t.logs.unpublished, undefined, { courseId, moduleId, lessonId });
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
    
    logAction(currentUser, 'create', 'lesson', newLesson.title, t.logs.created, { courseId, moduleId, lessonId: newLesson.id });

    setCourses(prev => prev.map(c => c.id !== courseId ? c : {
      ...c,
      modules: c.modules.map(m => m.id !== moduleId ? m : {
        ...m,
        lessons: [...m.lessons, newLesson]
      })
    }));
  };

  const reorderLesson = (courseId: string, moduleId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setCourses(prev => prev.map(c => {
        if (c.id !== courseId) return c;
        return {
            ...c,
            modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                const newLessons = arrayMove(m.lessons, fromIndex, toIndex);
                // Log only if needed, to avoid spamming logs during fast drags
                return { ...m, lessons: newLessons };
            })
        };
    }));
  };

  const moveLesson = (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => {
      // Compatibility wrapper for button-based moves if needed
      const toIndex = direction === 'up' ? index - 1 : index + 1;
      reorderLesson(courseId, moduleId, index, toIndex);
  };

  // Soft delete for teachers, hard delete for admins (when force=true)
  const deleteLesson = (courseId: string, moduleId: string, lessonId: string, force: boolean = false) => {
    if (force) {
        // Hard Delete
        logAction(currentUser, 'delete', 'lesson', 'Lesson', t.logs.deleted, { courseId, moduleId, lessonId });
        setCourses(prev => prev.map(c => c.id !== courseId ? c : {
           ...c,
           modules: c.modules.map(m => m.id !== moduleId ? m : {
               ...m,
               lessons: m.lessons.filter(l => l.id !== lessonId)
           })
       }));
    } else {
        // Soft Delete (Mark as pending)
        logAction(currentUser, 'delete', 'lesson', 'Lesson', t.pendingDeletion, { courseId, moduleId, lessonId });
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
      logAction(currentUser, 'restore', 'lesson', 'Lesson', t.logs.restored, { courseId, moduleId, lessonId });
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
    logAction(currentUser, 'create', 'module', newModule.title, t.logs.created, { courseId, moduleId: newModule.id });
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

  const reorderModule = (courseId: string, fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setCourses(prev => prev.map(c => {
          if (c.id !== courseId) return c;
          const newModules = arrayMove(c.modules, fromIndex, toIndex);
          return { ...c, modules: newModules };
      }));
  };

  const moveModule = (courseId: string, index: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? index - 1 : index + 1;
    reorderModule(courseId, index, toIndex);
  };

  const deleteModule = (courseId: string, moduleId: string) => {
    logAction(currentUser, 'delete', 'module', 'Module', t.logs.deleted, { courseId, moduleId });
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
    logAction(currentUser, 'create', 'course', newCourse.title, t.logs.created, { courseId: newCourse.id });
    setCourses(prev => [...prev, newCourse]);
  };

  const updateCourse = (id: string, title: string, level: string, audience: string) => {
    logAction(currentUser, 'update', 'course', title, `Level: ${level}, Aud: ${audience}`, { courseId: id });
    setCourses(prev => prev.map(c => c.id !== id ? c : { ...c, title, level, targetAudience: audience }));
  };

  const reorderCourse = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setCourses(prev => arrayMove(prev, fromIndex, toIndex));
  };

  const moveCourse = (index: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? index - 1 : index + 1;
    reorderCourse(index, toIndex);
  };

  const deleteCourse = (id: string) => {
    const c = courses.find(x => x.id === id);
    if (c) logAction(currentUser, 'delete', 'course', c.title, t.logs.deleted, { courseId: id });
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
    reorderLesson,
    moveLesson,
    addModule,
    renameModule,
    deleteModule,
    reorderModule,
    moveModule,
    addCourse,
    updateCourse,
    deleteCourse,
    reorderCourse,
    moveCourse,
    publishLesson
  };
};
