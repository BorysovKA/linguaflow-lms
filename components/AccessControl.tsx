
import React, { useState } from 'react';
import { User, Course, Group } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, LayoutGrid, ChevronRight, ChevronDown, CheckSquare, Square, Plus, Trash2, Save, UserPlus } from 'lucide-react';

interface AccessControlProps {
  users: User[];
  groups: Group[];
  courses: Course[];
  onUpdateUserAccess: (userId: string, allowedContent: string[]) => void;
  onUpdateGroupAccess: (groupId: string, allowedContent: string[]) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupMembers: (groupId: string, studentIds: string[]) => void;
}

export const AccessControl: React.FC<AccessControlProps> = ({
  users,
  groups,
  courses,
  onUpdateUserAccess,
  onUpdateGroupAccess,
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroupMembers
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [newGroupName, setNewGroupName] = useState('');
  
  // Helper to get allowed content for current selection
  const getCurrentAllowed = (): string[] => {
      if (activeTab === 'users') {
          return users.find(u => u.id === selectedEntityId)?.allowedContent || [];
      } else {
          return groups.find(g => g.id === selectedEntityId)?.allowedContent || [];
      }
  };

  const handleToggleContent = (contentId: string) => {
      if (!selectedEntityId) return;
      
      const currentAllowed = getCurrentAllowed();
      let newAllowed: string[];

      if (currentAllowed.includes(contentId)) {
          newAllowed = currentAllowed.filter(id => id !== contentId);
      } else {
          newAllowed = [...currentAllowed, contentId];
      }

      if (activeTab === 'users') {
          onUpdateUserAccess(selectedEntityId, newAllowed);
      } else {
          onUpdateGroupAccess(selectedEntityId, newAllowed);
      }
  };

  const handleCreateGroup = () => {
      if (!newGroupName.trim()) return;
      onCreateGroup(newGroupName);
      setNewGroupName('');
  };

  const handleMemberToggle = (groupId: string, userId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      const isMember = group.studentIds.includes(userId);
      let newMembers: string[];
      
      if (isMember) {
          newMembers = group.studentIds.filter(id => id !== userId);
      } else {
          newMembers = [...group.studentIds, userId];
      }
      onUpdateGroupMembers(groupId, newMembers);
  };

  const students = users.filter(u => u.role === 'student');

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-6">
       {/* Left Panel: Selection */}
       <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
           <div className="flex border-b border-slate-200">
               <button 
                  onClick={() => { setActiveTab('users'); setSelectedEntityId(null); }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                   {t.students}
               </button>
               <button 
                  onClick={() => { setActiveTab('groups'); setSelectedEntityId(null); }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'groups' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                   {t.groups}
               </button>
           </div>
           
           <div className="p-4 flex-1 overflow-y-auto space-y-2">
               {activeTab === 'users' ? (
                   <>
                      <div className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.teachers}</div>
                      {users.filter(u => u.role === 'teacher').map(user => (
                           <button
                             key={user.id}
                             onClick={() => setSelectedEntityId(user.id)}
                             className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selectedEntityId === user.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                           >
                               <Users size={16} /> {user.name}
                           </button>
                      ))}
                      <div className="mt-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.students}</div>
                      {students.map(user => (
                           <button
                             key={user.id}
                             onClick={() => setSelectedEntityId(user.id)}
                             className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selectedEntityId === user.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                           >
                               <div className="w-2 h-2 rounded-full bg-slate-300"></div> {user.name}
                           </button>
                      ))}
                   </>
               ) : (
                   <div className="space-y-4">
                       <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder={t.groupName}
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           />
                           <button onClick={handleCreateGroup} className="bg-indigo-100 text-indigo-600 p-1.5 rounded hover:bg-indigo-200">
                               <Plus size={16} />
                           </button>
                       </div>
                       <div className="space-y-1">
                           {groups.map(group => (
                               <div key={group.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${selectedEntityId === group.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                                    onClick={() => setSelectedEntityId(group.id)}
                               >
                                   <div className="flex items-center gap-2 text-sm font-medium">
                                       <LayoutGrid size={16} /> {group.name}
                                       <span className="text-xs opacity-70">({group.studentIds.length})</span>
                                   </div>
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                                      className={`p-1 rounded ${selectedEntityId === group.id ? 'hover:bg-indigo-500 text-indigo-200' : 'text-slate-400 hover:text-red-500'}`}
                                   >
                                       <Trash2 size={14} />
                                   </button>
                               </div>
                           ))}
                       </div>
                   </div>
               )}
           </div>
       </div>

       {/* Right Panel: Content / Members */}
       <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
           {!selectedEntityId ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                   <Users size={48} className="mb-4 opacity-20" />
                   <p>{t.selectUserOrGroup}</p>
               </div>
           ) : (
               <>
                   {activeTab === 'groups' && (
                       <div className="p-4 border-b border-slate-200 bg-slate-50">
                           <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><UserPlus size={18} /> {t.members}</h3>
                           <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                               {students.map(student => {
                                   const group = groups.find(g => g.id === selectedEntityId);
                                   const isMember = group?.studentIds.includes(student.id);
                                   return (
                                       <button 
                                          key={student.id}
                                          onClick={() => handleMemberToggle(selectedEntityId, student.id)}
                                          className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                                              isMember 
                                              ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-medium' 
                                              : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'
                                          }`}
                                       >
                                           {isMember && <CheckSquare size={12} />} {student.name}
                                       </button>
                                   )
                               })}
                           </div>
                       </div>
                   )}
                   
                   <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2">
                       <CheckSquare size={18} /> {t.access}
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-6 space-y-4">
                       {courses.map(course => {
                           const allowed = getCurrentAllowed();
                           const isCourseAllowed = allowed.includes(course.id);
                           const isExpanded = expandedCourses[course.id];
                           
                           return (
                               <div key={course.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                   <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                                       <button onClick={() => setExpandedCourses(prev => ({...prev, [course.id]: !prev[course.id]}))}>
                                           {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                       </button>
                                       <button onClick={() => handleToggleContent(course.id)} className={isCourseAllowed ? "text-indigo-600" : "text-slate-400"}>
                                           {isCourseAllowed ? <CheckSquare size={20} /> : <Square size={20} />}
                                       </button>
                                       <span className={`font-medium ${isCourseAllowed ? 'text-slate-900' : 'text-slate-500'}`}>{course.title}</span>
                                       <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 ml-auto">{course.level}</span>
                                   </div>
                                   
                                   {isExpanded && (
                                       <div className="pl-10 pr-4 py-2 space-y-2 border-t border-slate-100">
                                           {course.modules.map(module => {
                                               // Check if allowed specifically OR via parent course
                                               const isModuleAllowed = allowed.includes(module.id) || isCourseAllowed;
                                               
                                               return (
                                                   <div key={module.id} className="space-y-1">
                                                       <div className="flex items-center gap-3 py-1">
                                                           <button 
                                                              onClick={() => handleToggleContent(module.id)} 
                                                              className={isModuleAllowed ? "text-indigo-600" : "text-slate-300"}
                                                              disabled={isCourseAllowed} // Disable if parent grants access
                                                           >
                                                               {isModuleAllowed ? <CheckSquare size={18} /> : <Square size={18} />}
                                                           </button>
                                                           <span className={`text-sm ${isModuleAllowed ? 'text-slate-800' : 'text-slate-400'}`}>{module.title}</span>
                                                       </div>
                                                       {/* Lessons - Optional Granularity */}
                                                       <div className="pl-8 border-l-2 border-slate-100 ml-2">
                                                            {module.lessons.map(lesson => {
                                                                const isLessonAllowed = allowed.includes(lesson.id) || isModuleAllowed;
                                                                return (
                                                                    <div key={lesson.id} className="flex items-center gap-3 py-1">
                                                                        <button 
                                                                            onClick={() => handleToggleContent(lesson.id)}
                                                                            className={isLessonAllowed ? "text-indigo-600" : "text-slate-200"}
                                                                            disabled={isModuleAllowed}
                                                                        >
                                                                            {isLessonAllowed ? <CheckSquare size={16} /> : <Square size={16} />}
                                                                        </button>
                                                                         <span className={`text-xs ${isLessonAllowed ? 'text-slate-700' : 'text-slate-400'}`}>{lesson.title}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                       </div>
                                                   </div>
                                               );
                                           })}
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                   </div>
               </>
           )}
       </div>
    </div>
  );
};
