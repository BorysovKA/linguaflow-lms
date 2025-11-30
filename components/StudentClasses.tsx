
import React from 'react';
import { Course } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PlayCircle, BookOpen, Trophy, ArrowRight, Star } from 'lucide-react';

interface StudentClassesProps {
  courses: Course[];
  onNavigateToCourse: (courseId: string) => void;
}

export const StudentClasses: React.FC<StudentClassesProps> = ({ courses, onNavigateToCourse }) => {
  const { t } = useLanguage();

  const getGradient = (level: string) => {
      // Premium iOS-like gradients
      if (level.startsWith('A')) return 'from-[#4ADE80] to-[#22C55E]'; // Green
      if (level.startsWith('B')) return 'from-[#60A5FA] to-[#3B82F6]'; // Blue
      return 'from-[#C084FC] to-[#A855F7]'; // Purple
  };

  const getProgress = (course: Course) => {
      const hash = course.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hash % 100;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t.myLearning}</h2>
            <p className="text-slate-500 font-medium mt-1">Keep up the momentum! You have {courses.length} active courses.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600">
            <Trophy size={16} className="text-amber-500" />
            <span>Total Score: 1,250 XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {courses.map((course, idx) => {
            const progress = getProgress(course);
            const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
            
            return (
              <div 
                key={course.id} 
                onClick={() => onNavigateToCourse(course.id)}
                className="group relative cursor-pointer flex flex-col"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                 {/* Card Container with Depth */}
                 <div className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/20 border border-slate-100 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden h-full flex flex-col">
                    
                    {/* Cover Art Area */}
                    <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${getGradient(course.level)}`}>
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        
                        {/* Decorative Circles */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 shadow-sm">
                             {course.level} Level
                        </div>

                        <div className="absolute bottom-4 left-6 text-white transform group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
                            <BookOpen size={48} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-bold text-xl text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                            {course.title}
                        </h3>
                        
                        <div className="flex gap-2 mb-6">
                            <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-slate-500">
                                {course.modules.length} Modules
                            </span>
                            <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-slate-500">
                                {totalLessons} Lessons
                            </span>
                        </div>

                        <div className="mt-auto">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-slate-400">Progress</span>
                                <span className="text-sm font-bold text-slate-700">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${getGradient(course.level)} shadow-[0_0_10px_rgba(99,102,241,0.5)]`} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="px-6 pb-6 pt-0">
                         <div className="w-full py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                             {progress > 0 ? t.continue : t.startCourse}
                             <PlayCircle size={16} className="group-hover:fill-white/20" />
                         </div>
                    </div>
                 </div>
              </div>
            );
        })}

        {courses.length === 0 && (
            <div className="col-span-full py-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No courses yet</h3>
                <p className="text-slate-400">Your assigned courses will appear here.</p>
            </div>
        )}
      </div>
    </div>
  );
};
