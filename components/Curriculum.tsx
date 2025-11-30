
import React, { useState, useRef, useEffect } from 'react';
import { Course, Lesson, ContentBlock, ContentType, UserRole, User, Group } from '../types';
import { ChevronRight, ChevronDown, FileText, Image as ImageIcon, CheckCircle, Edit3, Plus, ArrowUp, ArrowDown, Star, BarChart3, PenLine, FileUp, X, Trash2, AlertTriangle, Bold, Italic, List, Upload, FolderOpen, FolderClosed, BookOpen, Loader2, RefreshCw, Eye, EyeOff, RotateCcw, Sparkles, MessageSquare, Lightbulb, CheckSquare, Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeLessonContent } from '../services/geminiService';

interface CurriculumProps {
  courses: Course[];
  userRole: UserRole;
  user: User; // Current user
  userGroups?: Group[]; // Groups current user belongs to
  levels: string[];
  audiences: string[];
  initialSelection?: { courseId?: string; moduleId?: string; lessonId?: string } | null;
  onUpdateLesson?: (courseId: string, moduleId: string, lesson: Lesson, description?: string) => void;
  onAddLesson?: (courseId: string, moduleId: string) => void;
  onAddCourse?: () => void;
  onAddModule?: (courseId: string) => void;
  onMoveCourse?: (index: number, direction: 'up' | 'down') => void;
  onMoveModule?: (courseId: string, index: number, direction: 'up' | 'down') => void;
  onMoveLesson?: (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => void;
  onUpdateCourse?: (id: string, title: string, level: string, audience: string) => void;
  onRenameModule?: (courseId: string, moduleId: string, newTitle: string) => void;
  onRenameLesson?: (courseId: string, moduleId: string, lessonId: string, newTitle: string) => void;
  onDeleteCourse?: (id: string) => void;
  onDeleteModule?: (courseId: string, moduleId: string) => void;
  onDeleteLesson?: (courseId: string, moduleId: string, lessonId: string, force?: boolean) => void;
  onRestoreLesson?: (courseId: string, moduleId: string, lessonId: string, deletedBy?: string) => void;
  onPublishLesson?: (courseId: string, moduleId: string, lessonId: string, isPublished: boolean) => void;
}

export const Curriculum: React.FC<CurriculumProps> = ({ 
  courses, 
  userRole,
  user,
  userGroups = [],
  levels,
  audiences,
  initialSelection,
  onUpdateLesson, 
  onAddLesson, 
  onAddCourse, 
  onAddModule, 
  onMoveCourse, 
  onMoveModule, 
  onMoveLesson, 
  onUpdateCourse, 
  onRenameModule,
  onRenameLesson,
  onDeleteCourse,
  onDeleteModule,
  onDeleteLesson,
  onRestoreLesson,
  onPublishLesson
}) => {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [selectedLesson, setSelectedLesson] = useState<{ courseId: string, moduleId: string, lesson: Lesson } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
  // AI Co-pilot State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState<'grammar' | 'ideas' | 'rewrite'>('grammar');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // State for interactive quizzes in student view
  const [quizState, setQuizState] = useState<Record<string, { selected: number | null, isCorrect: boolean | null }>>({});

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'course' | 'module' | 'lesson';
    ids: { id1: string, id2?: string, id3?: string };
    isSoftDelete: boolean;
  } | null>(null);

  const [editingItem, setEditingItem] = useState<{
    type: 'course' | 'module' | 'lesson';
    id: string; 
    moduleId?: string;
    lessonId?: string;
    title: string;
    level?: string;
    audience?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // --- VISIBILITY LOGIC ---
  const isContentVisible = (courseId: string, moduleId?: string, lessonId?: string): boolean => {
      // Admins and Methodists see everything
      if (userRole === 'admin' || userRole === 'methodist') return true;

      // Check denied content (Blocklist) - specific override
      if (lessonId && user.deniedContent?.includes(lessonId)) return false;

      const userAllowed = user.allowedContent || [];
      const groupsAllowed = userGroups.flatMap(g => g.allowedContent);
      const allAllowed = [...userAllowed, ...groupsAllowed];

      // Check if course is allowed
      if (allAllowed.includes(courseId)) return true; // Parent granted
      if (!moduleId) return false; // Not allowed at course level

      // Check if module is allowed
      if (allAllowed.includes(moduleId)) return true; // Parent granted
      if (!lessonId) return false;

      // Check if lesson is allowed
      if (allAllowed.includes(lessonId)) return true;

      return false;
  };

  const isDraftVisible = (lesson: Lesson): boolean => {
      // Admin/Methodist see pending deletions
      if (lesson.status === 'pending_deletion') {
          return userRole === 'admin' || userRole === 'methodist';
      }

      if (lesson.status === 'published') return true;
      
      // Drafts: Visible to Admin, Methodist, or Author
      if (userRole === 'admin' || userRole === 'methodist') return true;
      if (userRole === 'teacher' && lesson.authorId === user.id) return true;
      return false;
  };

  // Filter the course tree based on visibility
  const visibleCourses = courses.filter(c => isContentVisible(c.id) || c.modules.some(m => isContentVisible(c.id, m.id) || m.lessons.some(l => isContentVisible(c.id, m.id, l.id))))
      .map(c => {
          // If Course is explicitly allowed, show all. If not, filter modules.
          const isCourseAllowed = isContentVisible(c.id);
          
          // Filter Modules
          const validModules = c.modules.filter(m => {
              const isModuleAllowed = isContentVisible(c.id, m.id) || isCourseAllowed;
              // Show module if allowed, OR if it has allowed lessons
              return isModuleAllowed || m.lessons.some(l => isContentVisible(c.id, m.id, l.id));
          }).map(m => {
              const isModuleAllowed = isContentVisible(c.id, m.id) || isCourseAllowed;
              
              // Filter Lessons
              const validLessons = m.lessons.filter(l => (isContentVisible(c.id, m.id, l.id) || isModuleAllowed) && isDraftVisible(l));
              return { ...m, lessons: validLessons };
          }).filter(m => {
              // FIX: Show empty modules to non-students (Admins, Methodists, Teachers) so they can add lessons
              if (userRole !== 'student') return true;
              return m.lessons.length > 0;
          });

          return { ...c, modules: validModules };
      }).filter(c => {
          // FIX: Allow empty courses to be visible for Admins/Methodists so they can add content
          if (userRole === 'admin' || userRole === 'methodist') return true;
          // For others, only show if it has content
          return c.modules.length > 0;
      });

  // -----------------------

  useEffect(() => {
    if (initialSelection) {
      if (initialSelection.moduleId) {
        setExpandedModules(prev => ({ ...prev, [initialSelection.moduleId!]: true }));
      }
      
      if (initialSelection.lessonId && initialSelection.courseId && initialSelection.moduleId) {
        const course = courses.find(c => c.id === initialSelection.courseId);
        const module = course?.modules.find(m => m.id === initialSelection.moduleId);
        const lesson = module?.lessons.find(l => l.id === initialSelection.lessonId);
        
        if (course && module && lesson) {
            setSelectedLesson({ courseId: course.id, moduleId: module.id, lesson });
            // Reset quiz state when changing lessons
            setQuizState({});
            // Reset AI Panel
            setAiResponse(null);
            // Don't close panel if already open, just reset content
        }
      }
    }
  }, [initialSelection, courses]);

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };
  
  const expandAll = () => {
      const allModules: Record<string, boolean> = {};
      courses.forEach(c => c.modules.forEach(m => allModules[m.id] = true));
      setExpandedModules(allModules);
  };

  const collapseAll = () => {
      setExpandedModules({});
  };

  // Permission Logic
  const canModify = (courseId: string, moduleId?: string) => {
      if (userRole === 'admin' || userRole === 'methodist') return true;
      if (userRole === 'teacher') {
          // Teacher can add/edit if they have access to the parent container
          if (moduleId) return isContentVisible(courseId, moduleId);
          return isContentVisible(courseId);
      }
      return false;
  };
  
  const canPublish = userRole === 'methodist' || userRole === 'admin';
  const canSetReadiness = userRole === 'methodist' || userRole === 'admin';
  const canRate = userRole === 'methodist' || userRole === 'admin' || userRole === 'teacher';

  const handleLessonSelect = (courseId: string, moduleId: string, lesson: Lesson) => {
    setSelectedLesson({ courseId, moduleId, lesson });
    setIsEditing(false);
    setQuizState({});
    setAiResponse(null);
  };

  // AI Functionality
  const handleAiAnalyze = async () => {
      if (!selectedLesson) return;
      setAiLoading(true);
      setAiResponse(null);
      
      try {
          const result = await analyzeLessonContent(
              selectedLesson.lesson, 
              aiMode,
              aiMode === 'rewrite' ? customPrompt : undefined
          );
          setAiResponse(result);
      } catch (error) {
          console.error(error);
          setAiResponse("Failed to analyze lesson.");
      } finally {
          setAiLoading(false);
      }
  };

  // ... (Quiz Logic Redacted for brevity, same as previous) ...
  const handleQuizAnswer = (blockId: string, optionIndex: number, correctIndex: number) => {
    setQuizState(prev => ({ ...prev, [blockId]: { selected: optionIndex, isCorrect: optionIndex === correctIndex } }));
  };
  const resetQuiz = (blockId: string) => { setQuizState(prev => { const newState = { ...prev }; delete newState[blockId]; return newState; }); };
  // ...

  const requestDelete = (e: React.MouseEvent, type: 'course' | 'module' | 'lesson', id1: string, id2?: string, id3?: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Determine if it's a soft delete (teacher deleting lesson) or hard delete (admin/methodist)
    // Teachers effectively "Request Deletion" which hides it from them
    const isSoft = userRole === 'teacher' && type === 'lesson';

    setDeleteConfirmation({
      isOpen: true,
      type,
      ids: { id1, id2, id3 },
      isSoftDelete: isSoft
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;
    const { type, ids, isSoftDelete } = deleteConfirmation;

    if (type === 'course') {
        onDeleteCourse?.(ids.id1);
        if (selectedLesson?.courseId === ids.id1) setSelectedLesson(null);
    }
    if (type === 'module' && ids.id2) {
        onDeleteModule?.(ids.id1, ids.id2);
        if (selectedLesson?.moduleId === ids.id2) setSelectedLesson(null);
    }
    if (type === 'lesson' && ids.id2 && ids.id3) {
        // Pass "force = true" if it's NOT a soft delete (Admin/Methodist actually deleting)
        // Teachers: force = false (soft delete)
        onDeleteLesson?.(ids.id1, ids.id2, ids.id3, !isSoftDelete);
        
        // If teacher soft-deletes the current lesson, unselect it
        if (selectedLesson?.lesson.id === ids.id3) setSelectedLesson(null);
    }
    setDeleteConfirmation(null);
  };

  const handleRestore = (lesson: Lesson, courseId: string, moduleId: string) => {
      onRestoreLesson?.(courseId, moduleId, lesson.id, lesson.deletedBy);
      if (selectedLesson?.lesson.id === lesson.id) {
          // Update local selection to reflect restored status (optional, usually re-render handles it)
          setSelectedLesson({ ...selectedLesson, lesson: { ...lesson, status: 'draft', deletedBy: undefined }});
      }
  };

  const handleSaveContent = () => {
    if (selectedLesson && onUpdateLesson) {
      onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, selectedLesson.lesson, t.logs.contentUpdated);
      setIsEditing(false);
    }
  };

  const handleRate = (newRating: number) => {
    if (!selectedLesson) return;
    const updatedLesson = { ...selectedLesson.lesson, rating: newRating };
    setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
    
    if (!isEditing && onUpdateLesson) {
        onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, updatedLesson, `${t.logs.ratingUpdated} ${newRating}`);
    }
  };

  const handleAddBlock = (type: ContentType, initialContent: string = '') => {
    if (!selectedLesson) return;
    let metadata = undefined;
    if (type === ContentType.QUIZ) metadata = { options: ['Option 1', 'Option 2'], correctIndex: 0 };
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: initialContent || (type === ContentType.TEXT ? 'New text content...' : type === ContentType.QUIZ ? 'New Question?' : 'https://picsum.photos/600/300'),
      metadata
    };
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: [...selectedLesson.lesson.blocks, newBlock] } });
  };
  
  // ... (Block update logic mostly same) ...
  const handleUpdateBlock = (blockId: string, content: string) => {
     if (!selectedLesson) return;
     const updatedBlocks = selectedLesson.lesson.blocks.map(b => b.id === blockId ? { ...b, content } : b);
     setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };
  const handleDeleteBlock = (blockId: string) => {
    if (!selectedLesson) return;
    const updatedBlocks = selectedLesson.lesson.blocks.filter(b => b.id !== blockId);
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!selectedLesson) return;
    const blocks = [...selectedLesson.lesson.blocks];
    if (direction === 'up' && index > 0) [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
    else if (direction === 'down' && index < blocks.length - 1) [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks } });
  };
  // ...

  const insertFormat = (blockId: string, tag: 'b' | 'i' | 'ul') => {
    const textarea = document.getElementById(`textarea-${blockId}`) as HTMLTextAreaElement;
    if (!textarea || !selectedLesson) return;
    const start = textarea.selectionStart; const end = textarea.selectionEnd; const text = textarea.value; const selectedText = text.substring(start, end);
    let replacement = ''; if (tag === 'b') replacement = `<b>${selectedText}</b>`; if (tag === 'i') replacement = `<i>${selectedText}</i>`; if (tag === 'ul') replacement = `\n<ul>\n  <li>${selectedText}</li>\n</ul>\n`;
    const newContent = text.substring(0, start) + replacement + text.substring(end); handleUpdateBlock(blockId, newContent);
  };
  // ... (Quiz option handlers) ...
  const handleQuizOptionChange = (blockId: string, optIndex: number, newVal: string) => {
    if (!selectedLesson) return;
    const updatedBlocks = selectedLesson.lesson.blocks.map(b => {
      if (b.id !== blockId) return b;
      const newOptions = [...(b.metadata?.options || [])]; newOptions[optIndex] = newVal; return { ...b, metadata: { ...b.metadata, options: newOptions } };
    }); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };
  const setQuizCorrectAnswer = (blockId: string, optIndex: number) => {
    if (!selectedLesson) return;
    const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; return { ...b, metadata: { ...b.metadata, correctIndex: optIndex } }; });
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };
  const addQuizOption = (blockId: string) => {
    if (!selectedLesson) return;
    const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; const newOptions = [...(b.metadata?.options || []), `Option ${(b.metadata?.options?.length || 0) + 1}`]; return { ...b, metadata: { ...b.metadata, options: newOptions } }; });
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };
  const removeQuizOption = (blockId: string, optIndex: number) => {
    if (!selectedLesson) return;
    const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; const newOptions = (b.metadata?.options || []).filter((_: any, i: number) => i !== optIndex); let newCorrect = b.metadata?.correctIndex || 0; if (optIndex < newCorrect) newCorrect--; if (newCorrect >= newOptions.length) newCorrect = Math.max(0, newOptions.length - 1); return { ...b, metadata: { ...b.metadata, options: newOptions, correctIndex: newCorrect } }; });
    setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } });
  };

  const handleImageUpload = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { handleUpdateBlock(blockId, reader.result as string); }; reader.readAsDataURL(file);
  };
  const handleImportDoc = () => { fileInputRef.current?.click(); };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsConverting(true); const reader = new FileReader();
    reader.onload = async (event) => { const arrayBuffer = event.target?.result as ArrayBuffer; try { const mammoth = (await import('mammoth')).default; const result = await mammoth.convertToHtml({ arrayBuffer }); handleAddBlock(ContentType.TEXT, result.value); if (fileInputRef.current) fileInputRef.current.value = ''; } catch (err) { console.error("Failed to convert .docx", err); alert("Error converting file. Please ensure it is a valid .docx file."); } finally { setIsConverting(false); } }; reader.readAsArrayBuffer(file);
  };

  const initiateEditCourse = (course: Course) => { setEditingItem({ type: 'course', id: course.id, title: course.title, level: course.level, audience: course.targetAudience }); };
  const initiateEditModule = (courseId: string, module: any) => { setEditingItem({ type: 'module', id: courseId, moduleId: module.id, title: module.title }); };
  const initiateEditLesson = (courseId: string, moduleId: string, lesson: Lesson) => { setEditingItem({ type: 'lesson', id: courseId, moduleId: moduleId, lessonId: lesson.id, title: lesson.title }); };

  const submitEdit = (e: React.FormEvent) => {
      e.preventDefault(); if (!editingItem) return;
      if (editingItem.type === 'course') { onUpdateCourse?.(editingItem.id, editingItem.title, editingItem.level || levels[0], editingItem.audience || audiences[0]); } 
      else if (editingItem.type === 'module' && editingItem.moduleId) { onRenameModule?.(editingItem.id, editingItem.moduleId, editingItem.title); } 
      else if (editingItem.type === 'lesson' && editingItem.moduleId && editingItem.lessonId) { onRenameLesson?.(editingItem.id, editingItem.moduleId, editingItem.lessonId, editingItem.title); }
      setEditingItem(null);
  };

  const getCourseStats = (course: Course) => {
    let totalRating = 0; let totalReadiness = 0; let ratedLessons = 0; let totalLessons = 0;
    course.modules.forEach(m => { m.lessons.forEach(l => { totalLessons++; if (l.rating) { totalRating += l.rating; ratedLessons++; } if (l.readiness) { totalReadiness += l.readiness; } }); });
    return { avgRating: ratedLessons > 0 ? (totalRating / ratedLessons).toFixed(1) : '-', avgReadiness: totalLessons > 0 ? Math.round(totalReadiness / totalLessons) : 0 };
  };
  const getModuleStats = (lessons: Lesson[]) => {
    let totalRating = 0; let totalReadiness = 0; let ratedLessons = 0;
    lessons.forEach(l => { if (l.rating) { totalRating += l.rating; ratedLessons++; } if (l.readiness) { totalReadiness += l.readiness; } });
    return { avgRating: ratedLessons > 0 ? (totalRating / ratedLessons).toFixed(1) : '-', avgReadiness: lessons.length > 0 ? Math.round(totalReadiness / lessons.length) : 0 };
  };

  const updateReadiness = (val: number) => {
    if (!selectedLesson) return; const updatedLesson = { ...selectedLesson.lesson, readiness: val }; setSelectedLesson({ ...selectedLesson, lesson: updatedLesson });
    if (onUpdateLesson) { onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, updatedLesson, `${t.logs.readinessUpdated} ${val}%`); }
  };
  
  const getReadinessColor = (val: number) => {
      if (val === 100) return 'bg-green-500 border-green-600'; if (val >= 75) return 'bg-indigo-500 border-indigo-600'; if (val >= 50) return 'bg-yellow-400 border-yellow-500'; return 'bg-orange-400 border-orange-500';
  };
  const ReadinessControl = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
      const steps = [25, 50, 75, 100];
      return (
          <div className="flex flex-col gap-1 select-none"><span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none">{t.readiness}</span>
              <div className="flex items-center gap-1.5 h-6"><div className="flex gap-1">{steps.map(step => (<div key={step} onClick={() => onChange(step)} className={`w-6 h-2.5 rounded-sm cursor-pointer transition-all duration-200 border ${value >= step ? getReadinessColor(value) : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`} />))}</div><div className="w-10 text-right font-bold text-slate-700 text-sm flex justify-end">{value > 0 ? (<span className={value === 100 ? 'text-green-600' : ''}>{value}%</span>) : (<span onClick={() => onChange(25)} className="text-slate-300 cursor-pointer hover:text-slate-400">0%</span>)}</div></div>
          </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 relative">
      {/* Sidebar List - Fixed Width */}
      <div className="w-[360px] flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* ... (Existing Sidebar Code) ... */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">{t.courses}</h2>
          <div className="flex gap-1">
             <button onClick={expandAll} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all" title="Expand All"><FolderOpen size={16} /></button>
             <button onClick={collapseAll} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all" title="Collapse All"><FolderClosed size={16} /></button>
             {canModify('all') && <button onClick={onAddCourse} className="ml-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-2 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm"><Plus size={14} /> {t.addCourse}</button>}
          </div>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {visibleCourses.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                  <p>No content available.</p>
              </div>
          )}
          {visibleCourses.map((course, cIdx) => {
            const cStats = getCourseStats(course);
            const canModifyCourse = canModify(course.id);
            return (
              <div key={course.id} className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-3 font-semibold text-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-base truncate pr-2" title={course.title}>{course.title}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canModifyCourse && (
                        <>
                          <button 
                            onClick={() => initiateEditCourse(course)} 
                            className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600"
                          >
                            <PenLine size={14} />
                          </button>
                          <button onClick={() => onMoveCourse?.(cIdx, 'up')} className="p-1.5 hover:bg-slate-200 rounded text-slate-400"><ArrowUp size={14} /></button>
                          <button onClick={() => onMoveCourse?.(cIdx, 'down')} className="p-1.5 hover:bg-slate-200 rounded text-slate-400"><ArrowDown size={14} /></button>
                          <button 
                            type="button"
                            onClick={(e) => requestDelete(e, 'course', course.id)} 
                            className="p-1.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs font-normal mb-1">
                      <span className={`text-xs border px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border-slate-200`}>
                        {course.level}
                      </span>
                  </div>
                  {/* Show stats only for teachers/admins */}
                  {userRole !== 'student' && (
                    <div className="flex gap-2 text-xs font-normal">
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                        <Star size={10} /> {t.avgRating}: {cStats.avgRating}
                      </span>
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                        <BarChart3 size={10} /> {t.avgReadiness}: {cStats.avgReadiness}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-3">
                  {course.modules.map((module, mIdx) => {
                     const mStats = getModuleStats(module.lessons);
                     const canModifyModule = canModify(course.id, module.id);
                     return (
                      <div key={module.id}>
                        <div className="flex items-center justify-between group">
                          <button 
                            onClick={() => toggleModule(module.id)}
                            className="flex-1 flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-sm font-medium text-slate-600 text-left min-w-0"
                          >
                            {expandedModules[module.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="truncate">{module.title}</span>
                          </button>
                          {canModifyModule && (
                            <div className="hidden group-hover:flex items-center gap-1 mr-2 flex-shrink-0">
                              <button onClick={() => initiateEditModule(course.id, module)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><PenLine size={12} /></button>
                              <button onClick={() => onMoveModule?.(course.id, mIdx, 'up')} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={12} /></button>
                              <button onClick={() => onMoveModule?.(course.id, mIdx, 'down')} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={12} /></button>
                              <button 
                                type="button"
                                onClick={(e) => requestDelete(e, 'module', course.id, module.id)} 
                                className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {userRole !== 'student' && (
                            <div className="px-8 flex gap-2 text-[10px] text-slate-400 mb-1">
                            <span>{t.avgRating}: {mStats.avgRating}</span>
                            <span>{t.avgReadiness}: {mStats.avgReadiness}%</span>
                            </div>
                        )}
                        
                        {expandedModules[module.id] && (
                          <div className="ml-6 mt-1 space-y-1 pl-2 border-l border-slate-200">
                            {module.lessons.map((lesson, lIdx) => (
                              <div key={lesson.id} className="group flex items-center gap-1 pr-1">
                                <button
                                  onClick={() => handleLessonSelect(course.id, module.id, lesson)}
                                  className={`flex-1 text-left text-sm p-2 rounded flex items-center gap-2 min-w-0 ${
                                    selectedLesson?.lesson.id === lesson.id 
                                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                    : 'text-slate-500 hover:text-slate-900'
                                  } ${lesson.status === 'pending_deletion' ? 'opacity-75 bg-red-50/50' : ''}`}
                                >
                                  {/* Status indicator */}
                                  <div 
                                    className={`w-2 h-2 rounded-full flex-shrink-0 
                                      ${lesson.status === 'published' ? 'bg-green-400' 
                                        : lesson.status === 'pending_deletion' ? 'bg-red-500' 
                                        : 'bg-slate-300'}`} 
                                    title={lesson.status} 
                                  />
                                  <span className={`truncate ${lesson.status === 'draft' ? 'italic text-slate-400' : ''} ${lesson.status === 'pending_deletion' ? 'text-red-600 line-through decoration-red-300' : ''}`}>
                                      {lesson.title}
                                  </span>
                                </button>
                                {canModifyModule && (
                                  <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                                      {lesson.status !== 'pending_deletion' && (
                                        <>
                                          <div className="flex flex-col">
                                              <button onClick={() => onMoveLesson?.(course.id, module.id, lIdx, 'up')} className="hover:text-indigo-600 text-slate-300 p-0.5"><ArrowUp size={10} /></button>
                                              <button onClick={() => onMoveLesson?.(course.id, module.id, lIdx, 'down')} className="hover:text-indigo-600 text-slate-300 p-0.5"><ArrowDown size={10} /></button>
                                          </div>
                                          <button 
                                            type="button"
                                            onClick={() => initiateEditLesson(course.id, module.id, lesson)} 
                                            className="text-slate-300 hover:text-indigo-600 p-1"
                                            title="Rename Lesson"
                                          >
                                              <PenLine size={12} />
                                          </button>
                                        </>
                                      )}
                                      <button 
                                        type="button"
                                        onClick={(e) => requestDelete(e, 'lesson', course.id, module.id, lesson.id)} 
                                        className="text-slate-300 hover:text-red-500 p-1"
                                        title="Delete"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {canModifyModule && (
                              <button 
                                onClick={() => onAddLesson && onAddLesson(course.id, module.id)}
                                className="text-xs text-indigo-500 hover:underline px-2 py-1 mt-1"
                              >
                                {t.addLesson}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {canModify(course.id) && (
                    <button 
                      onClick={() => onAddModule && onAddModule(course.id)}
                      className="w-full text-xs text-slate-400 border border-dashed border-slate-200 p-2 rounded hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> {t.addModule}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area - Fluid Width */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm flex overflow-hidden">
        {selectedLesson ? (
          <div className="flex flex-1 overflow-hidden">
             {/* Main Lesson Editor */}
             <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${selectedLesson.lesson.status === 'pending_deletion' ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                       {canSetReadiness && (
                           <div className="flex-shrink-0 flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300 group">
                               <ReadinessControl 
                                  value={selectedLesson.lesson.readiness || 0}
                                  onChange={(val) => updateReadiness(val)}
                               />
                           </div>
                       )}
                       <h2 className={`font-bold text-lg truncate ${selectedLesson.lesson.status === 'pending_deletion' ? 'text-red-700' : 'text-slate-800'}`}>
                         {selectedLesson.lesson.title}
                       </h2>
                       {selectedLesson.lesson.status === 'draft' && (
                           <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 uppercase">{t.draft}</span>
                       )}
                       {selectedLesson.lesson.status === 'pending_deletion' && (
                           <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-700 uppercase flex items-center gap-1">
                              <AlertTriangle size={12} /> {t.pendingDeletion}
                           </span>
                       )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* AI Toggle Button */}
                        {canModify(selectedLesson.courseId, selectedLesson.moduleId) && (
                            <button 
                                onClick={() => setShowAiPanel(!showAiPanel)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    showAiPanel 
                                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-100' 
                                    : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                                }`}
                                title="AI Co-pilot"
                            >
                                <Sparkles size={16} /> 
                                <span className="hidden lg:inline">{t.aiHelper.title}</span>
                            </button>
                        )}

                        {/* Admin Restore Controls */}
                        {selectedLesson.lesson.status === 'pending_deletion' && (userRole === 'admin' || userRole === 'methodist') && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleRestore(selectedLesson.lesson, selectedLesson.courseId, selectedLesson.moduleId)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
                                >
                                    <RotateCcw size={16} /> {t.restoreAndBlock}
                                </button>
                                <button 
                                    onClick={(e) => requestDelete(e, 'lesson', selectedLesson.courseId, selectedLesson.moduleId, selectedLesson.lesson.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                                >
                                    <Trash2 size={16} /> {t.permanentlyDelete}
                                </button>
                            </div>
                        )}

                        {/* Publish Button */}
                        {canPublish && selectedLesson.lesson.status !== 'pending_deletion' && (
                            <button 
                                onClick={() => onPublishLesson?.(selectedLesson.courseId, selectedLesson.moduleId, selectedLesson.lesson.id, selectedLesson.lesson.status !== 'published')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    selectedLesson.lesson.status === 'published' 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                            >
                                {selectedLesson.lesson.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                                {selectedLesson.lesson.status === 'published' ? t.unpublish : t.publish}
                            </button>
                        )}

                        {canRate && selectedLesson.lesson.status !== 'pending_deletion' && (
                            <div className="flex gap-0.5 mr-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button 
                                      key={star} 
                                      onClick={() => handleRate(star)}
                                      className={`hover:scale-110 transition-transform ${selectedLesson.lesson.rating && selectedLesson.lesson.rating >= star ? 'text-amber-400' : 'text-slate-300'}`}
                                    >
                                        <Star size={16} fill={selectedLesson.lesson.rating && selectedLesson.lesson.rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {canModify(selectedLesson.courseId, selectedLesson.moduleId) && selectedLesson.lesson.status !== 'pending_deletion' && (
                            !isEditing ? (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
                                >
                                    <Edit3 size={16} /> {t.edit}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSaveContent}
                                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                                >
                                    <CheckCircle size={16} /> {t.saveChanges}
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className={`flex-1 overflow-y-auto p-8 space-y-6 ${selectedLesson.lesson.status === 'pending_deletion' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    {selectedLesson.lesson.blocks.length === 0 && (
                        <div className="text-center py-20 text-slate-400">
                            <p>{t.draft}</p>
                            {isEditing && <p className="text-sm mt-2">Use the tools below to add content.</p>}
                        </div>
                    )}
                    {/* Content Rendering (Same as before) */}
                    {selectedLesson.lesson.blocks.map((block, index) => (
                        <div key={block.id} className={`relative group ${isEditing ? 'pl-8' : ''}`}>
                             {/* ... (Editing controls - ArrowUp, Trash, ArrowDown - Same as before) ... */}
                            {isEditing && (
                                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleMoveBlock(index, 'up')} 
                                      disabled={index === 0}
                                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteBlock(block.id)}
                                      className="p-1 text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveBlock(index, 'down')} 
                                      disabled={index === selectedLesson.lesson.blocks.length - 1}
                                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                </div>
                            )}

                            {isEditing ? (
                                // ... (Edit mode render same as before) ...
                                 <div className="border border-indigo-100 rounded-lg bg-indigo-50/30 overflow-hidden">
                                    {block.type === ContentType.TEXT ? (
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1 border-b border-indigo-100 bg-indigo-50 px-2 py-1">
                                                <button onClick={() => insertFormat(block.id, 'b')} className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700" title="Bold"><Bold size={14} /></button>
                                                <button onClick={() => insertFormat(block.id, 'i')} className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700" title="Italic"><Italic size={14} /></button>
                                                <button onClick={() => insertFormat(block.id, 'ul')} className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700" title="List"><List size={14} /></button>
                                            </div>
                                            <textarea 
                                                id={`textarea-${block.id}`}
                                                value={block.content}
                                                onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
                                                className="w-full h-32 p-3 focus:outline-none text-sm bg-white text-slate-900"
                                                placeholder="Enter text here... use HTML tags or buttons above."
                                            />
                                        </div>
                                    ) : block.type === ContentType.QUIZ ? (
                                        <div className="p-3">
                                            <div className="mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Question</label>
                                                <input type="text" value={block.content} onChange={(e) => handleUpdateBlock(block.id, e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm mt-1 bg-white text-slate-900 placeholder:text-slate-400" placeholder="Enter question..." />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-end mb-1">
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Options</label>
                                                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Select correct answer</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {block.metadata?.options?.map((opt: string, i: number) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <input type="radio" name={`quiz-correct-${block.id}`} checked={block.metadata?.correctIndex === i} onChange={() => setQuizCorrectAnswer(block.id, i)} className="mt-0.5 accent-indigo-600 w-4 h-4 cursor-pointer" />
                                                            <input type="text" value={opt} onChange={(e) => handleQuizOptionChange(block.id, i, e.target.value)} className={`flex-1 p-1.5 text-sm border rounded bg-white text-slate-900 ${block.metadata?.correctIndex === i ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-300'}`} />
                                                            <button onClick={() => removeQuizOption(block.id, i)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addQuizOption(block.id)} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1 mt-2"><Plus size={12} /> Add Option</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : block.type === ContentType.IMAGE ? (
                                        <div className="p-3">
                                            <div className="flex gap-2 mb-2">
                                               {block.content && block.content.startsWith('data:') && (<img src={block.content} alt="Preview" className="h-20 w-20 object-cover rounded border border-slate-200" />)}
                                               <div className="flex-1 flex flex-col justify-center">
                                                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded cursor-pointer hover:bg-slate-50 transition-colors w-fit mb-2"><Upload size={14} className="text-slate-500" /><span className="text-sm text-slate-700">Upload Image File</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(block.id, e)} /></label>
                                                    <p className="text-xs text-slate-400">or paste URL below</p>
                                               </div>
                                            </div>
                                            <input type="text" value={block.content} onChange={(e) => handleUpdateBlock(block.id, e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 placeholder:text-slate-400" placeholder="Image URL..." />
                                        </div>
                                    ) : (
                                        <div className="p-3"><input type="text" value={block.content} onChange={(e) => handleUpdateBlock(block.id, e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 placeholder:text-slate-400" placeholder="Content..." /></div>
                                    )}
                                    <div className="px-3 pb-1 text-[10px] text-indigo-400 font-mono uppercase text-right">{block.type}</div>
                                </div>
                            ) : (
                                // ... (View mode render same as before) ...
                                 <div className="prose max-w-none text-slate-900">
                                    {block.type === ContentType.TEXT && (<div className="whitespace-pre-wrap bg-white rounded-lg p-4 shadow-sm border border-slate-100" dangerouslySetInnerHTML={{ __html: block.content }} />)}
                                    {block.type === ContentType.IMAGE && (<img src={block.content} alt="Lesson content" className="rounded-lg shadow-sm max-h-96 object-cover bg-white" />)}
                                    {block.type === ContentType.NOTE && (<div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-amber-800 rounded-r text-sm italic shadow-sm"><span className="font-bold block not-italic mb-1">{t.teacherNote}:</span>{block.content}</div>)}
                                    {block.type === ContentType.QUIZ && (
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-4"><h4 className="font-bold flex items-center gap-2 text-slate-700"><CheckCircle size={16} /> {block.content}</h4>{quizState[block.id] && (<button onClick={() => resetQuiz(block.id)} className="text-slate-400 hover:text-indigo-600 p-1" title="Reset Quiz"><RefreshCw size={14} /></button>)}</div>
                                            <div className="space-y-2">
                                                {block.metadata?.options?.map((opt: string, i: number) => {
                                                    const isSelected = quizState[block.id]?.selected === i;
                                                    const hasAnswered = quizState[block.id]?.selected !== undefined;
                                                    const isCorrectAnswer = block.metadata?.correctIndex === i;
                                                    let stateStyles = "bg-white border-slate-200 hover:bg-slate-50";
                                                    let icon = <div className={`w-4 h-4 rounded-full border border-slate-300`} />;
                                                    if (hasAnswered) {
                                                        if (isSelected) {
                                                            if (isCorrectAnswer) { stateStyles = "bg-green-50 border-green-300 ring-1 ring-green-300"; icon = <div className="w-4 h-4 rounded-full border border-green-500 bg-green-500 flex items-center justify-center text-white text-[10px]">✓</div>; } 
                                                            else { stateStyles = "bg-red-50 border-red-300 ring-1 ring-red-300"; icon = <div className="w-4 h-4 rounded-full border border-red-500 bg-red-500 flex items-center justify-center text-white text-[10px]">✕</div>; }
                                                        } else if (isCorrectAnswer) { stateStyles = "bg-green-50/50 border-green-200 border-dashed"; }
                                                    }
                                                    return (<div key={i} onClick={() => !hasAnswered && handleQuizAnswer(block.id, i, block.metadata?.correctIndex)} className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${stateStyles} ${!hasAnswered ? 'cursor-pointer shadow-sm' : 'cursor-default'}`}><div className="flex-shrink-0 mt-0.5">{icon}</div><span className={`text-sm ${isSelected && isCorrectAnswer ? 'font-medium text-green-800' : isSelected ? 'font-medium text-red-800' : 'text-slate-700'}`}>{opt}</span></div>);
                                                })}
                                            </div>
                                            {quizState[block.id] && (<div className={`mt-3 text-sm font-medium ${quizState[block.id].isCorrect ? 'text-green-600' : 'text-red-500'}`}>{quizState[block.id].isCorrect ? "Correct! Well done." : "Incorrect. Try again!"}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 overflow-x-auto">
                        <button onClick={() => handleAddBlock(ContentType.TEXT)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:text-indigo-600 transition-colors whitespace-nowrap"><FileText size={16} /> {t.addText}</button>
                        <button onClick={() => handleAddBlock(ContentType.IMAGE)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:text-indigo-600 transition-colors whitespace-nowrap"><ImageIcon size={16} /> {t.addImage}</button>
                        <button onClick={() => handleAddBlock(ContentType.QUIZ)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:text-indigo-600 transition-colors whitespace-nowrap"><CheckCircle size={16} /> Quiz</button>
                        <button onClick={() => handleAddBlock(ContentType.NOTE)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:text-amber-600 transition-colors whitespace-nowrap"><Edit3 size={16} /> {t.addNote}</button>
                        <div className="w-px h-8 bg-slate-300 mx-1" />
                        <button onClick={handleImportDoc} disabled={isConverting} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 transition-colors whitespace-nowrap disabled:opacity-50">{isConverting ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} {isConverting ? "Converting..." : t.importWord}</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".docx" className="hidden" />
                    </div>
                )}
             </div>

             {/* AI Sidebar Panel */}
             {showAiPanel && (
                 <div className="w-80 border-l border-slate-200 bg-white flex flex-col shadow-xl z-20 transition-all">
                     <div className="p-4 bg-purple-600 text-white flex justify-between items-center">
                         <div className="flex items-center gap-2 font-bold">
                             <Sparkles size={18} className="text-yellow-300" />
                             {t.aiHelper.title}
                         </div>
                         <button onClick={() => setShowAiPanel(false)} className="text-white/80 hover:text-white p-1 hover:bg-purple-700 rounded">
                             <X size={18} />
                         </button>
                     </div>

                     <div className="p-2 bg-purple-50 flex gap-1 border-b border-purple-100">
                         <button 
                             onClick={() => setAiMode('grammar')}
                             className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex flex-col items-center gap-1 ${aiMode === 'grammar' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-purple-100'}`}
                         >
                             <CheckSquare size={14} />
                             {t.aiHelper.checkGrammar}
                         </button>
                         <button 
                             onClick={() => setAiMode('ideas')}
                             className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex flex-col items-center gap-1 ${aiMode === 'ideas' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-purple-100'}`}
                         >
                             <Lightbulb size={14} />
                             {t.aiHelper.getIdeas}
                         </button>
                         <button 
                             onClick={() => setAiMode('rewrite')}
                             className={`flex-1 py-2 text-xs font-medium rounded transition-colors flex flex-col items-center gap-1 ${aiMode === 'rewrite' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-purple-100'}`}
                         >
                             <Languages size={14} />
                             {t.aiHelper.rewrite}
                         </button>
                     </div>

                     <div className="flex-1 overflow-y-auto p-4 space-y-4">
                         {aiMode === 'rewrite' && (
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.aiHelper.customPrompt}</label>
                                 <textarea 
                                     value={customPrompt}
                                     onChange={(e) => setCustomPrompt(e.target.value)}
                                     placeholder="e.g. Translate to Ukrainian..."
                                     className="w-full text-sm p-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-20 resize-none bg-slate-50"
                                 />
                             </div>
                         )}

                         {!aiResponse && !aiLoading && (
                             <div className="text-center py-8 text-slate-400">
                                 <Sparkles size={32} className="mx-auto mb-2 text-slate-300" />
                                 <p className="text-sm">{t.aiHelper.placeholder}</p>
                             </div>
                         )}

                         {aiLoading && (
                             <div className="flex flex-col items-center justify-center py-8 gap-3 text-purple-600">
                                 <Loader2 size={32} className="animate-spin" />
                                 <p className="text-sm font-medium">{t.aiHelper.analyzing}</p>
                             </div>
                         )}

                         {aiResponse && (
                             <div className="prose prose-sm prose-purple max-w-none">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-2 mb-3">{t.aiHelper.results}</h4>
                                 <div className="whitespace-pre-wrap text-slate-700 text-sm">
                                     {aiResponse}
                                 </div>
                             </div>
                         )}
                     </div>

                     <div className="p-4 border-t border-slate-200 bg-slate-50">
                         <button 
                             onClick={handleAiAnalyze}
                             disabled={aiLoading}
                             className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                         >
                             {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                             {t.aiHelper.analyze}
                         </button>
                     </div>
                 </div>
             )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <BookOpen size={48} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">{t.lessonPlan}</p>
            <p className="text-sm">{t.selectLesson}</p>
          </div>
        )}
      </div>

      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-xl border border-slate-100 transform transition-all scale-100">
                <div className="flex items-center gap-3 text-red-600 mb-4"><div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={24} /></div><h3 className="text-lg font-bold text-slate-900">{t.delete}</h3></div>
                <p className="text-slate-600 mb-6">{deleteConfirmation.isSoftDelete ? "Request deletion for this lesson? It will be hidden from your view but visible to admins for final removal." : t.confirmDelete}</p>
                <div className="flex gap-3 justify-end"><button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">{t.cancel}</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md shadow-red-100">{deleteConfirmation.isSoftDelete ? "Request Delete" : t.delete}</button></div>
            </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-xl border border-slate-100">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-900">{editingItem.type === 'course' ? t.edit : t.rename}</h3><button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                <form onSubmit={submitEdit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.newCourseTitle}</label><input autoFocus type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 bg-white" /></div>
                    {editingItem.type === 'course' && (
                      <>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.level}</label><select value={editingItem.level} onChange={e => setEditingItem({...editingItem, level: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 bg-white">{levels.map(l => (<option key={l} value={l}>{l}</option>))}</select></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.targetAudience}</label><select value={editingItem.audience} onChange={e => setEditingItem({...editingItem, audience: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 bg-white">{audiences.map(a => (<option key={a} value={a}>{a}</option>))}</select></div>
                      </>
                    )}
                    <div className="flex gap-2 justify-end mt-6"><button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">{t.cancel}</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{t.saveChanges}</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};