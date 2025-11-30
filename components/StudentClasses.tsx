import React from 'react';
import { Course } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PlayCircle, BookOpen, Trophy, ArrowRight } from 'lucide-react';

interface StudentClassesProps {
  courses: Course[];
  onNavigateToCourse: (courseId: string) => void;
}

export const StudentClasses: React.FC<StudentClassesProps> = ({ courses, onNavigateToCourse }) => {
  const { t } = useLanguage();

  const getGradient = (level: string) => {
      if (level.startsWith('A')) return 'from-green-400 to-emerald-500';
      if (level.startsWith('B')) return 'from-blue-400 to-indigo-500';
      return 'from-purple-400 to-fuchsia-500';
  };

  const getProgress = (course: Course) => {
      // Mock progress calculation based on a hash of the ID for consistency in demo
      const hash = course.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hash % 100;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.myLearning}</h2>
        <p className="text-slate-500">{t.activeCourses}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {courses.map(course => {
            const progress = getProgress(course);
            const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
            
            return (
              <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                <div className={`h-32 bg-gradient-to-r ${getGradient(course.level)} p-6 relative`}>
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold border border-white/30">
                        {course.level}
                    </div>
                    <BookOpen className="text-white/80 absolute bottom-4 left-6" size={48} />
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">
                             {course.modules.length} {t.modules.toLowerCase()}
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">
                             {totalLessons} {t.totalLessons.toLowerCase()}
                        </span>
                    </p>

                    <div className="mt-auto space-y-3">
                        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                            <span>{t.courseProgress}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-full rounded-full bg-gradient-to-r ${getGradient(course.level)}`} 
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <button 
                            onClick={() => onNavigateToCourse(course.id)}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-50 text-indigo-600 font-medium hover:bg-indigo-50 hover:text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white"
                        >
                            {progress > 0 ? (
                                <>
                                   <PlayCircle size={18} /> {t.continue}
                                </>
                            ) : (
                                <>
                                   <ArrowRight size={18} /> {t.startCourse}
                                </>
                            )}
                        </button>
                    </div>
                </div>
              </div>
            );
        })}

        {courses.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Trophy size={48} className="mx-auto mb-4 text-slate-300" />
                <p>No courses available yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};