
import React, { useState, useRef, useEffect } from 'react';
import { Course, Lesson, ContentBlock, ContentType, UserRole, User, Group } from '../types';
import { 
  ChevronRight, ChevronDown, FileText, Image as ImageIcon, CheckCircle, 
  Edit3, Plus, ArrowUp, ArrowDown, Star, BarChart3, PenLine, FileUp, 
  X, Trash2, AlertTriangle, Bold, Italic, List, Upload, FolderOpen, 
  FolderClosed, BookOpen, Loader2, RefreshCw, Eye, EyeOff, RotateCcw, 
  Sparkles, Lightbulb, CheckSquare, Languages, Search, ChevronLeft, MoreVertical, LayoutGrid
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeLessonContent } from '../services/geminiService';

// DnD Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onReorderCourse?: (from: number, to: number) => void;
  onReorderModule?: (courseId: string, from: number, to: number) => void;
  onReorderLesson?: (courseId: string, moduleId: string, from: number, to: number) => void;
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

// --- Sortable Item Wrapper ---
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as 'relative',
    touchAction: 'none' // Important for touch devices
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'shadow-2xl rounded-xl' : ''}>
      {children}
    </div>
  );
};

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
  onReorderCourse,
  onReorderModule,
  onReorderLesson,
  onUpdateCourse, 
  onRenameModule,
  onRenameLesson,
  onDeleteCourse,
  onDeleteModule,
  onDeleteLesson,
  onRestoreLesson,
  onPublishLesson
}) => {
  // Navigation State
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  
  // Editor State
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

  // --- DnD Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Start dragging only after moving 5px, prevents accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- VISIBILITY LOGIC ---
  const isContentVisible = (courseId: string, moduleId?: string, lessonId?: string): boolean => {
      if (userRole === 'admin' || userRole === 'methodist') return true;
      if (lessonId && user.deniedContent?.includes(lessonId)) return false;
      const userAllowed = user.allowedContent || [];
      const groupsAllowed = userGroups.flatMap(g => g.allowedContent);
      const allAllowed = [...userAllowed, ...groupsAllowed];
      if (allAllowed.includes(courseId)) return true; 
      if (!moduleId) return false;
      if (allAllowed.includes(moduleId)) return true;
      if (!lessonId) return false;
      if (allAllowed.includes(lessonId)) return true;
      return false;
  };

  const visibleCourses = courses.filter(c => 
    (isContentVisible(c.id) || c.modules.some(m => isContentVisible(c.id, m.id) || m.lessons.some(l => isContentVisible(c.id, m.id, l.id)))) &&
    (c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) || c.level.toLowerCase().includes(courseSearchTerm.toLowerCase()))
  );

  // -----------------------

  useEffect(() => {
    if (initialSelection) {
      if (initialSelection.courseId) setActiveCourseId(initialSelection.courseId);
      if (initialSelection.moduleId) setExpandedModules(prev => ({ ...prev, [initialSelection.moduleId!]: true }));
      
      if (initialSelection.lessonId && initialSelection.courseId && initialSelection.moduleId) {
        const course = courses.find(c => c.id === initialSelection.courseId);
        const module = course?.modules.find(m => m.id === initialSelection.moduleId);
        const lesson = module?.lessons.find(l => l.id === initialSelection.lessonId);
        
        if (course && module && lesson) {
            setSelectedLesson({ courseId: course.id, moduleId: module.id, lesson });
            setQuizState({});
            setAiResponse(null);
        }
      }
    }
  }, [initialSelection, courses]);

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };
  
  const canModify = (courseId: string, moduleId?: string) => {
      if (userRole === 'admin' || userRole === 'methodist') return true;
      if (userRole === 'teacher') {
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

  // --- DND HANDLERS ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Identify what was dragged by checking ID prefixes (c=Course, m=Module, l=Lesson)
    // NOTE: In a real app with UUIDs, we would look up the item type in the data structure
    // Since mockData uses prefixes, we can guess, but let's be safer and find the item in courses.
    
    // 1. Try Course Reorder
    const courseOldIdx = courses.findIndex(c => c.id === active.id);
    const courseNewIdx = courses.findIndex(c => c.id === over.id);
    
    if (courseOldIdx !== -1 && courseNewIdx !== -1) {
        onReorderCourse?.(courseOldIdx, courseNewIdx);
        return;
    }

    // 2. Try Module Reorder (Modules exist inside activeCourseId)
    if (activeCourseId) {
        const activeCourse = courses.find(c => c.id === activeCourseId);
        if (activeCourse) {
             const modOldIdx = activeCourse.modules.findIndex(m => m.id === active.id);
             const modNewIdx = activeCourse.modules.findIndex(m => m.id === over.id);
             
             if (modOldIdx !== -1 && modNewIdx !== -1) {
                 onReorderModule?.(activeCourseId, modOldIdx, modNewIdx);
                 return;
             }

             // 3. Try Lesson Reorder
             // Lesson IDs are unique globally in mock, but we need to find which module they belong to
             for (const module of activeCourse.modules) {
                 const lessonOldIdx = module.lessons.findIndex(l => l.id === active.id);
                 const lessonNewIdx = module.lessons.findIndex(l => l.id === over.id);
                 
                 if (lessonOldIdx !== -1 && lessonNewIdx !== -1) {
                     onReorderLesson?.(activeCourseId, module.id, lessonOldIdx, lessonNewIdx);
                     return;
                 }
             }
        }
    }
  };

  // ... (AI, Quiz, Delete, Block logic same as before) ...
  const handleAiAnalyze = async () => { if (!selectedLesson) return; setAiLoading(true); setAiResponse(null); try { const result = await analyzeLessonContent(selectedLesson.lesson, aiMode, aiMode === 'rewrite' ? customPrompt : undefined); setAiResponse(result); } catch (error) { console.error(error); setAiResponse("Failed to analyze lesson."); } finally { setAiLoading(false); } };
  const handleQuizAnswer = (blockId: string, optionIndex: number, correctIndex: number) => { setQuizState(prev => ({ ...prev, [blockId]: { selected: optionIndex, isCorrect: optionIndex === correctIndex } })); };
  const resetQuiz = (blockId: string) => { setQuizState(prev => { const newState = { ...prev }; delete newState[blockId]; return newState; }); };
  const requestDelete = (e: React.MouseEvent | React.TouchEvent, type: 'course' | 'module' | 'lesson', id1: string, id2?: string, id3?: string) => { e.stopPropagation(); e.preventDefault(); const isSoft = userRole === 'teacher' && type === 'lesson'; setDeleteConfirmation({ isOpen: true, type, ids: { id1, id2, id3 }, isSoftDelete: isSoft }); };
  const confirmDelete = () => { if (!deleteConfirmation) return; const { type, ids, isSoftDelete } = deleteConfirmation; if (type === 'course') { onDeleteCourse?.(ids.id1); if (selectedLesson?.courseId === ids.id1) setSelectedLesson(null); if (activeCourseId === ids.id1) setActiveCourseId(null); } if (type === 'module' && ids.id2) { onDeleteModule?.(ids.id1, ids.id2); if (selectedLesson?.moduleId === ids.id2) setSelectedLesson(null); } if (type === 'lesson' && ids.id2 && ids.id3) { onDeleteLesson?.(ids.id1, ids.id2, ids.id3, !isSoftDelete); if (selectedLesson?.lesson.id === ids.id3) setSelectedLesson(null); } setDeleteConfirmation(null); };
  const handleRestore = (lesson: Lesson, courseId: string, moduleId: string) => { onRestoreLesson?.(courseId, moduleId, lesson.id, lesson.deletedBy); if (selectedLesson?.lesson.id === lesson.id) { setSelectedLesson({ ...selectedLesson, lesson: { ...lesson, status: 'draft', deletedBy: undefined }}); } };
  const handleSaveContent = () => { if (selectedLesson && onUpdateLesson) { onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, selectedLesson.lesson, t.logs.contentUpdated); setIsEditing(false); } };
  const handleRate = (newRating: number) => { if (!selectedLesson) return; const updatedLesson = { ...selectedLesson.lesson, rating: newRating }; setSelectedLesson({ ...selectedLesson, lesson: updatedLesson }); if (!isEditing && onUpdateLesson) { onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, updatedLesson, `${t.logs.ratingUpdated} ${newRating}`); } };
  
  // Block handlers
  const handleAddBlock = (type: ContentType, initialContent: string = '') => { if (!selectedLesson) return; let metadata = undefined; if (type === ContentType.QUIZ) metadata = { options: ['Option 1', 'Option 2'], correctIndex: 0 }; const newBlock: ContentBlock = { id: Date.now().toString(), type, content: initialContent || (type === ContentType.TEXT ? 'New text content...' : type === ContentType.QUIZ ? 'New Question?' : 'https://picsum.photos/600/300'), metadata }; setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: [...selectedLesson.lesson.blocks, newBlock] } }); };
  const handleUpdateBlock = (blockId: string, content: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => b.id === blockId ? { ...b, content } : b); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const handleDeleteBlock = (blockId: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.filter(b => b.id !== blockId); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => { if (!selectedLesson) return; const blocks = [...selectedLesson.lesson.blocks]; if (direction === 'up' && index > 0) [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]]; else if (direction === 'down' && index < blocks.length - 1) [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]; setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks } }); };
  const insertFormat = (blockId: string, tag: 'b' | 'i' | 'ul') => { const textarea = document.getElementById(`textarea-${blockId}`) as HTMLTextAreaElement; if (!textarea || !selectedLesson) return; const start = textarea.selectionStart; const end = textarea.selectionEnd; const text = textarea.value; const selectedText = text.substring(start, end); let replacement = ''; if (tag === 'b') replacement = `<b>${selectedText}</b>`; if (tag === 'i') replacement = `<i>${selectedText}</i>`; if (tag === 'ul') replacement = `\n<ul>\n  <li>${selectedText}</li>\n</ul>\n`; const newContent = text.substring(0, start) + replacement + text.substring(end); handleUpdateBlock(blockId, newContent); };
  const handleQuizOptionChange = (blockId: string, optIndex: number, newVal: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; const newOptions = [...(b.metadata?.options || [])]; newOptions[optIndex] = newVal; return { ...b, metadata: { ...b.metadata, options: newOptions } }; }); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const setQuizCorrectAnswer = (blockId: string, optIndex: number) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; return { ...b, metadata: { ...b.metadata, correctIndex: optIndex } }; }); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const addQuizOption = (blockId: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; const newOptions = [...(b.metadata?.options || []), `Option ${(b.metadata?.options?.length || 0) + 1}`]; return { ...b, metadata: { ...b.metadata, options: newOptions } }; }); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const removeQuizOption = (blockId: string, optIndex: number) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => { if (b.id !== blockId) return b; const newOptions = (b.metadata?.options || []).filter((_: any, i: number) => i !== optIndex); let newCorrect = b.metadata?.correctIndex || 0; if (optIndex < newCorrect) newCorrect--; if (newCorrect >= newOptions.length) newCorrect = Math.max(0, newOptions.length - 1); return { ...b, metadata: { ...b.metadata, options: newOptions, correctIndex: newCorrect } }; }); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const handleImageUpload = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { handleUpdateBlock(blockId, reader.result as string); }; reader.readAsDataURL(file); };
  const handleImportDoc = () => { fileInputRef.current?.click(); };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setIsConverting(true); const reader = new FileReader(); reader.onload = async (event) => { const arrayBuffer = event.target?.result as ArrayBuffer; try { const mammoth = (await import('mammoth')).default; const result = await mammoth.convertToHtml({ arrayBuffer }); handleAddBlock(ContentType.TEXT, result.value); if (fileInputRef.current) fileInputRef.current.value = ''; } catch (err) { console.error("Failed to convert .docx", err); alert("Error converting file. Please ensure it is a valid .docx file."); } finally { setIsConverting(false); } }; reader.readAsArrayBuffer(file); };
  const initiateEditCourse = (course: Course) => { setEditingItem({ type: 'course', id: course.id, title: course.title, level: course.level, audience: course.targetAudience }); };
  const initiateEditModule = (courseId: string, module: any) => { setEditingItem({ type: 'module', id: courseId, moduleId: module.id, title: module.title }); };
  const initiateEditLesson = (courseId: string, moduleId: string, lesson: Lesson) => { setEditingItem({ type: 'lesson', id: courseId, moduleId: moduleId, lessonId: lesson.id, title: lesson.title }); };
  const submitEdit = (e: React.FormEvent) => { e.preventDefault(); if (!editingItem) return; if (editingItem.type === 'course') { onUpdateCourse?.(editingItem.id, editingItem.title, editingItem.level || levels[0], editingItem.audience || audiences[0]); } else if (editingItem.type === 'module' && editingItem.moduleId) { onRenameModule?.(editingItem.id, editingItem.moduleId, editingItem.title); } else if (editingItem.type === 'lesson' && editingItem.moduleId && editingItem.lessonId) { onRenameLesson?.(editingItem.id, editingItem.moduleId, editingItem.lessonId, editingItem.title); } setEditingItem(null); };
  const updateReadiness = (val: number) => { if (!selectedLesson) return; const updatedLesson = { ...selectedLesson.lesson, readiness: val }; setSelectedLesson({ ...selectedLesson, lesson: updatedLesson }); if (onUpdateLesson) { onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, updatedLesson, `${t.logs.readinessUpdated} ${val}%`); } };
  const getReadinessColor = (val: number) => { if (val === 100) return 'bg-green-500 border-green-600'; if (val >= 75) return 'bg-indigo-500 border-indigo-600'; if (val >= 50) return 'bg-yellow-400 border-yellow-500'; return 'bg-orange-400 border-orange-500'; };
  const ReadinessControl = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => { const steps = [25, 50, 75, 100]; return ( <div className="flex flex-col gap-1 select-none"><span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none">{t.readiness}</span> <div className="flex items-center gap-1.5 h-6"><div className="flex gap-1">{steps.map(step => (<div key={step} onClick={() => onChange(step)} className={`w-6 h-2.5 rounded-sm cursor-pointer transition-all duration-200 border ${value >= step ? getReadinessColor(value) : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`} />))}</div><div className="w-10 text-right font-bold text-slate-700 text-sm flex justify-end">{value > 0 ? (<span className={value === 100 ? 'text-green-600' : ''}>{value}%</span>) : (<span onClick={() => onChange(25)} className="text-slate-300 cursor-pointer hover:text-slate-400">0%</span>)}</div></div> </div> ); };
  const getCourseColor = (level: string) => { const lvl = level.toLowerCase(); if (lvl.includes('a1')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'; if (lvl.includes('a2')) return 'bg-teal-100 text-teal-700 border-teal-200'; if (lvl.includes('b1')) return 'bg-cyan-100 text-cyan-700 border-cyan-200'; if (lvl.includes('b2')) return 'bg-sky-100 text-sky-700 border-sky-200'; if (lvl.includes('c1')) return 'bg-indigo-100 text-indigo-700 border-indigo-200'; return 'bg-violet-100 text-violet-700 border-violet-200'; };

  // --------------------------------------------------------------------------------
  // SIDEBAR RENDER LOGIC (Drill-down)
  // --------------------------------------------------------------------------------

  const renderSidebarContent = () => {
    // VIEW 1: Module & Lesson Tree (Drill Down)
    if (activeCourseId) {
      const activeCourse = courses.find(c => c.id === activeCourseId);
      if (!activeCourse) return null; // Should not happen

      const canModifyCourse = canModify(activeCourse.id);

      return (
        <div className="flex flex-col h-full bg-slate-50/50 animate-fade-in">
          {/* Header with Back Button */}
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center gap-2">
            <button 
              onClick={() => setActiveCourseId(null)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors border border-transparent hover:border-slate-200"
              title="Back to Courses"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-slate-800 text-sm truncate" title={activeCourse.title}>
                 {activeCourse.title}
               </h3>
               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${getCourseColor(activeCourse.level)}`}>{activeCourse.level}</span>
            </div>
            {canModifyCourse && (
                 <button 
                   onClick={() => onAddModule && onAddModule(activeCourse.id)}
                   className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-100"
                   title={t.addModule}
                 >
                   <Plus size={18} />
                 </button>
            )}
          </div>

          {/* Module Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {activeCourse.modules.length === 0 && (
                 <div className="text-center py-10 text-slate-400 text-sm">
                    No modules yet. Click + to add one.
                 </div>
             )}
             
             <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
             >
                 <SortableContext 
                    items={activeCourse.modules.map(m => m.id)} 
                    strategy={verticalListSortingStrategy}
                    disabled={!canModifyCourse}
                 >
                     {activeCourse.modules.map((module, mIdx) => {
                         const canModifyModule = canModify(activeCourse.id, module.id);
                         const isExpanded = expandedModules[module.id];
                         
                         return (
                           <SortableItem key={module.id} id={module.id} disabled={!canModifyCourse}>
                             <div className="group">
                               {/* Module Header - DRAGGABLE */}
                               <div className={`flex items-center justify-between mb-1 rounded-lg border border-transparent transition-all ${canModifyModule ? 'cursor-grab active:cursor-grabbing hover:border-slate-200 hover:bg-white/50' : ''}`}>
                                  <div 
                                    className={`flex-1 flex items-center gap-2 p-2 rounded-lg text-sm font-bold text-left min-w-0 ${isExpanded ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-700'}`}
                                  >
                                     <button onClick={(e) => { e.stopPropagation(); toggleModule(module.id); }} className="p-1 hover:bg-slate-100 rounded">
                                         {isExpanded ? <FolderOpen size={16} className="text-indigo-500" /> : <FolderClosed size={16} className="text-slate-400" />}
                                     </button>
                                     <span className="truncate select-none">{module.title}</span>
                                     <span className="text-xs text-slate-400 font-normal ml-auto px-2">{module.lessons.length}</span>
                                  </div>
                                  
                                  {canModifyModule && (
                                     <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                        <button onClick={(e) => { e.stopPropagation(); initiateEditModule(activeCourse.id, module); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><PenLine size={14} /></button>
                                        <button onClick={(e) => requestDelete(e, 'module', activeCourse.id, module.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                                     </div>
                                  )}
                               </div>

                               {/* Lessons List */}
                               {isExpanded && (
                                 <div className="ml-3 pl-3 border-l-2 border-slate-200 space-y-1 relative">
                                    <SortableContext 
                                        items={module.lessons.map(l => l.id)} 
                                        strategy={verticalListSortingStrategy}
                                        disabled={!canModifyModule}
                                    >
                                        {module.lessons.map((lesson, lIdx) => (
                                           <SortableItem key={lesson.id} id={lesson.id} disabled={!canModifyModule}>
                                               <div className="relative group/lesson flex items-center pr-1">
                                                  <div
                                                     onClick={() => handleLessonSelect(activeCourse.id, module.id, lesson)}
                                                     className={`flex-1 text-left text-sm py-2 px-3 rounded-lg flex items-center gap-2 min-w-0 transition-all cursor-pointer ${canModifyModule ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                                       selectedLesson?.lesson.id === lesson.id 
                                                       ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100 font-medium' 
                                                       : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                                     } ${lesson.status === 'pending_deletion' ? 'opacity-60 bg-red-50/50' : ''}`}
                                                  >
                                                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                          lesson.status === 'published' ? 'bg-emerald-400' :
                                                          lesson.status === 'pending_deletion' ? 'bg-red-400' : 'bg-slate-300'
                                                      }`} />
                                                      <span className={`truncate select-none ${lesson.status === 'pending_deletion' ? 'line-through text-red-800' : ''}`}>
                                                          {lesson.title}
                                                      </span>
                                                  </div>
                                                  
                                                  {canModifyModule && (
                                                     <div className="absolute right-2 hidden group-hover/lesson:flex items-center bg-white/90 backdrop-blur rounded shadow-sm border border-slate-100 z-10">
                                                        <button onClick={(e) => { e.stopPropagation(); initiateEditLesson(activeCourse.id, module.id, lesson); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><PenLine size={12} /></button>
                                                        <button onClick={(e) => requestDelete(e, 'lesson', activeCourse.id, module.id, lesson.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                                                     </div>
                                                  )}
                                               </div>
                                           </SortableItem>
                                        ))}
                                    </SortableContext>

                                    {canModifyModule && (
                                       <button 
                                         onClick={() => onAddLesson && onAddLesson(activeCourse.id, module.id)}
                                         className="ml-3 mt-1 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1.5 hover:bg-indigo-50 rounded transition-colors"
                                       >
                                          <Plus size={14} /> {t.addLesson}
                                       </button>
                                    )}
                                 </div>
                               )}
                             </div>
                           </SortableItem>
                         );
                     })}
                 </SortableContext>
             </DndContext>
          </div>
        </div>
      );
    }

    // VIEW 2: Course List (Root)
    return (
      <div className="flex flex-col h-full animate-fade-in">
         <div className="p-4 border-b border-slate-100 bg-white">
            <h2 className="font-bold text-lg text-slate-800 mb-3">{t.courses}</h2>
            <div className="relative mb-3">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                  type="text" 
                  placeholder="Search courses..." 
                  value={courseSearchTerm}
                  onChange={(e) => setCourseSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
            </div>
            {canModify('all') && (
                <button 
                   onClick={onAddCourse} 
                   className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm"
                >
                   <Plus size={16} /> {t.addCourse}
                </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={visibleCourses.map(c => c.id)} 
                    strategy={verticalListSortingStrategy}
                    disabled={!canModify('all')}
                >
                    {visibleCourses.map((course, idx) => {
                       const canModifyCourse = canModify(course.id);
                       // Simple stats calculation
                       const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
                       const levelColor = getCourseColor(course.level);

                       return (
                          <SortableItem key={course.id} id={course.id} disabled={!canModifyCourse}>
                              <div 
                                 onClick={() => setActiveCourseId(course.id)}
                                 className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden ${canModifyCourse ? 'cursor-grab active:cursor-grabbing' : ''}`}
                              >
                                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${levelColor.replace('bg-', 'bg-').split(' ')[0].replace('100', '500')}`}></div>
                                 
                                 <div className="flex justify-between items-start mb-2 pl-2">
                                    <div className="flex-1 min-w-0">
                                       <h3 className="font-bold text-slate-800 text-sm truncate select-none">{course.title}</h3>
                                       <p className="text-xs text-slate-500 truncate mt-0.5 select-none">{course.targetAudience}</p>
                                    </div>
                                    {canModifyCourse && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => initiateEditCourse(course)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded hover:bg-white"><PenLine size={14} /></button>
                                            <button onClick={(e) => requestDelete(e, 'course', course.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded hover:bg-white"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                 </div>
                                 
                                 <div className="flex items-center justify-between mt-3 pl-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${levelColor}`}>
                                       {course.level}
                                    </span>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                       <span className="flex items-center gap-1"><LayoutGrid size={12} /> {course.modules.length}</span>
                                       <span className="flex items-center gap-1"><FileText size={12} /> {totalLessons}</span>
                                    </div>
                                 </div>
                              </div>
                          </SortableItem>
                       );
                    })}
                </SortableContext>
            </DndContext>
            
            {visibleCourses.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">
                   No courses found.
                </div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 relative">
      {/* Sidebar - Drill Down Navigation */}
      <div className="w-[360px] flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300">
         {renderSidebarContent()}
      </div>

      {/* Content Area - Fluid Width (Remains mostly unchanged in logic) */}
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
                    {/* Content Rendering */}
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
