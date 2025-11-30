
import { useState, useEffect } from 'react';
import { Course, Lesson, CourseModule, User, ActionType, TargetType, ContentBlock } from '../types';
import { dataService } from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';

// Helper for array moving
const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
};

// Helper to deep copy a lesson with new IDs
const deepCopyLesson = (lesson: Lesson, currentUser?: User | null): Lesson => {
    return {
        ...lesson,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: `${lesson.title} (Copy)`,
        status: 'draft',
        authorId: currentUser?.id,
        blocks: lesson.blocks.map(b => ({
            ...b,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5)
        }))
    };
};

// Helper to deep copy a module
const deepCopyModule = (module: CourseModule, currentUser?: User | null): CourseModule => {
    return {
        ...module,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: `${module.title} (Copy)`,
        lessons: module.lessons.map(l => deepCopyLesson(l, currentUser))
    };
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
                return { ...m, lessons: newLessons };
            })
        };
    }));
  };

  const moveLesson = (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => {
      const toIndex = direction === 'up' ? index - 1 : index + 1;
      reorderLesson(courseId, moduleId, index, toIndex);
  };

  const copyLessonTo = (sourceCourseId: string, sourceModuleId: string, lessonId: string, targetCourseId: string, targetModuleId: string) => {
      const sourceCourse = courses.find(c => c.id === sourceCourseId);
      const sourceModule = sourceCourse?.modules.find(m => m.id === sourceModuleId);
      const lesson = sourceModule?.lessons.find(l => l.id === lessonId);

      if (!lesson) return;

      const newLesson = deepCopyLesson(lesson, currentUser);
      logAction(currentUser, 'copy', 'lesson', newLesson.title, `Copied from ${sourceCourse?.title}`, { courseId: targetCourseId, moduleId: targetModuleId, lessonId: newLesson.id });

      setCourses(prev => prev.map(c => c.id !== targetCourseId ? c : {
          ...c,
          modules: c.modules.map(m => m.id !== targetModuleId ? m : {
              ...m,
              lessons: [...m.lessons, newLesson]
          })
      }));
  };

  const moveLessonTo = (sourceCourseId: string, sourceModuleId: string, lessonId: string, targetCourseId: string, targetModuleId: string) => {
      if (sourceCourseId === targetCourseId && sourceModuleId === targetModuleId) return;

      const sourceCourse = courses.find(c => c.id === sourceCourseId);
      const sourceModule = sourceCourse?.modules.find(m => m.id === sourceModuleId);
      const lesson = sourceModule?.lessons.find(l => l.id === lessonId);

      if (!lesson) return;

      // 1. Remove from source
      setCourses(prev => {
          const withoutLesson = prev.map(c => c.id !== sourceCourseId ? c : {
              ...c,
              modules: c.modules.map(m => m.id !== sourceModuleId ? m : {
                  ...m,
                  lessons: m.lessons.filter(l => l.id !== lessonId)
              })
          });

          // 2. Add to target
          return withoutLesson.map(c => c.id !== targetCourseId ? c : {
              ...c,
              modules: c.modules.map(m => m.id !== targetModuleId ? m : {
                  ...m,
                  lessons: [...m.lessons, lesson] // Keep original ID when moving
              })
          });
      });

      logAction(currentUser, 'move', 'lesson', lesson.title, `Moved to ${targetCourseId}/${targetModuleId}`, { courseId: targetCourseId, moduleId: targetModuleId, lessonId: lesson.id });
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

  const copyModuleTo = (sourceCourseId: string, moduleId: string, targetCourseId: string) => {
      const sourceCourse = courses.find(c => c.id === sourceCourseId);
      const module = sourceCourse?.modules.find(m => m.id === moduleId);

      if (!module) return;

      const newModule = deepCopyModule(module, currentUser);
      logAction(currentUser, 'copy', 'module', newModule.title, `Copied from ${sourceCourse?.title}`, { courseId: targetCourseId, moduleId: newModule.id });

      setCourses(prev => prev.map(c => c.id !== targetCourseId ? c : {
          ...c,
          modules: [...c.modules, newModule]
      }));
  };

  const moveModuleTo = (sourceCourseId: string, moduleId: string, targetCourseId: string) => {
      if (sourceCourseId === targetCourseId) return;

      const sourceCourse = courses.find(c => c.id === sourceCourseId);
      const module = sourceCourse?.modules.find(m => m.id === moduleId);

      if (!module) return;

      setCourses(prev => {
          // Remove from source
          const withoutModule = prev.map(c => c.id !== sourceCourseId ? c : {
              ...c,
              modules: c.modules.filter(m => m.id !== moduleId)
          });
          // Add to target
          return withoutModule.map(c => c.id !== targetCourseId ? c : {
              ...c,
              modules: [...c.modules, module]
          });
      });

      logAction(currentUser, 'move', 'module', module.title, `Moved to ${targetCourseId}`, { courseId: targetCourseId, moduleId: module.id });
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
        modules: [],
        color: 'bg-indigo-50' // Default color
    };
    logAction(currentUser, 'create', 'course', newCourse.title, t.logs.created, { courseId: newCourse.id });
    setCourses(prev => [...prev, newCourse]);
  };

  const updateCourse = (id: string, title: string, level: string, audience: string, color?: string) => {
    logAction(currentUser, 'update', 'course', title, `Level: ${level}, Aud: ${audience}`, { courseId: id });
    setCourses(prev => prev.map(c => c.id !== id ? c : { ...c, title, level, targetAudience: audience, color: color || c.color }));
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

  // Lessons Delete / Restore
  const deleteLesson = (courseId: string, moduleId: string, lessonId: string, force: boolean = false) => {
    if (force) {
        logAction(currentUser, 'delete', 'lesson', 'Lesson', t.logs.deleted, { courseId, moduleId, lessonId });
        setCourses(prev => prev.map(c => c.id !== courseId ? c : {
           ...c,
           modules: c.modules.map(m => m.id !== moduleId ? m : {
               ...m,
               lessons: m.lessons.filter(l => l.id !== lessonId)
           })
       }));
    } else {
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
                  status: 'draft',
                  deletedBy: undefined
              })
          })
      }));
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
    copyLessonTo,
    moveLessonTo,
    addModule,
    renameModule,
    deleteModule,
    reorderModule,
    moveModule,
    copyModuleTo,
    moveModuleTo,
    addCourse,
    updateCourse,
    deleteCourse,
    reorderCourse,
    moveCourse,
    publishLesson
  };
};
