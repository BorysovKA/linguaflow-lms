
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Course, Lesson, ContentBlock, ContentType, UserRole, User, Group, ActivityLogEntry } from '../types';
import { 
  ChevronRight, ChevronDown, FileText, Image as ImageIcon, CheckCircle, 
  Edit3, Plus, ArrowUp, ArrowDown, Star, BarChart3, PenLine, FileUp, 
  X, Trash2, AlertTriangle, Bold, Italic, List, Upload, FolderOpen, 
  FolderClosed, BookOpen, Loader2, RefreshCw, Eye, EyeOff, RotateCcw, 
  Sparkles, Lightbulb, CheckSquare, Languages, Search, ChevronLeft, MoreVertical, LayoutGrid, Copy, Move, PieChart,
  Globe, Laptop, Palette, Dna, Calculator, Music, Briefcase, MessageCircle, GraduationCap, Rocket, Bot
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeLessonContent } from '../services/geminiService';
import { AIArchitect } from './AIArchitect';

// DnD Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CurriculumProps {
  courses: Course[];
  userRole: UserRole;
  user: User; // Current user
  userGroups?: Group[]; // Groups current user belongs to
  levels: string[];
  audiences: string[];
  initialSelection?: { courseId?: string; moduleId?: string; lessonId?: string } | null;
  activityLog?: ActivityLogEntry[];
  
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
  
  onUpdateCourse?: (id: string, title: string, level: string, audience: string, color?: string, icon?: string) => void;
  onRenameModule?: (courseId: string, moduleId: string, newTitle: string) => void;
  onRenameLesson?: (courseId: string, moduleId: string, lessonId: string, newTitle: string) => void;
  
  onDeleteCourse?: (id: string) => void;
  onDeleteModule?: (courseId: string, moduleId: string) => void;
  onDeleteLesson?: (courseId: string, moduleId: string, lessonId: string, force?: boolean) => void;
  onRestoreLesson?: (courseId: string, moduleId: string, lessonId: string, deletedBy?: string) => void;
  onPublishLesson?: (courseId: string, moduleId: string, lessonId: string, isPublished: boolean) => void;

  // New Handlers for Cross-Move/Copy
  onCopyLesson?: (sourceCourseId: string, sourceModuleId: string, lessonId: string, targetCourseId: string, targetModuleId: string) => void;
  onMoveLessonTo?: (sourceCourseId: string, sourceModuleId: string, lessonId: string, targetCourseId: string, targetModuleId: string) => void;
  onCopyModule?: (sourceCourseId: string, moduleId: string, targetCourseId: string) => void;
  onMoveModuleTo?: (sourceCourseId: string, moduleId: string, targetCourseId: string) => void;
}

// --- Constants ---
const COURSE_COLORS = [
    { name: 'Teal', class: 'bg-teal-50 border-teal-100 text-teal-700' },
    { name: 'Indigo', class: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { name: 'Rose', class: 'bg-rose-50 border-rose-100 text-rose-700' },
    { name: 'Amber', class: 'bg-amber-50 border-amber-100 text-amber-700' },
    { name: 'Emerald', class: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { name: 'Slate', class: 'bg-slate-50 border-slate-100 text-slate-700' },
];

const COURSE_ICONS = [
  { name: 'Book', icon: BookOpen },
  { name: 'Business', icon: Briefcase },
  { name: 'Tech', icon: Laptop },
  { name: 'Science', icon: Dna },
  { name: 'Math', icon: Calculator },
  { name: 'Art', icon: Palette },
  { name: 'Music', icon: Music },
  { name: 'Global', icon: Globe },
  { name: 'Chat', icon: MessageCircle },
  { name: 'Rocket', icon: Rocket }
];

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
    touchAction: 'none'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'shadow-2xl rounded-xl ring-2 ring-indigo-400 opacity-50' : ''}>
      {children}
    </div>
  );
};

export const Curriculum: React.FC<CurriculumProps> = ({ 
  courses, userRole, user, userGroups = [], levels, audiences, initialSelection, activityLog = [],
  onUpdateLesson, onAddLesson, onAddCourse, onAddModule, 
  onReorderCourse, onReorderModule, onReorderLesson,
  onUpdateCourse, onRenameModule, onRenameLesson,
  onDeleteCourse, onDeleteModule, onDeleteLesson, onRestoreLesson, onPublishLesson,
  onCopyLesson, onMoveLessonTo, onCopyModule, onMoveModuleTo
}) => {
  
  // View State
  const [viewLevel, setViewLevel] = useState<'courses' | 'modules' | 'lessons'>('courses');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<{ courseId: string, moduleId: string, lesson: Lesson } | null>(null);

  // UI State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState<'grammar' | 'ideas' | 'rewrite'>('grammar');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [quizState, setQuizState] = useState<Record<string, { selected: number | null, isCorrect: boolean | null }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { t } = useLanguage();

  // Dialogs
  const [showStats, setShowStats] = useState(false);
  const [moveCopyDialog, setMoveCopyDialog] = useState<{
      isOpen: boolean;
      mode: 'move' | 'copy';
      type: 'lesson' | 'module';
      sourceId: string; // lesson or module id
      sourceCourseId: string;
      sourceModuleId?: string;
  } | null>(null);
  
  const [editingItem, setEditingItem] = useState<{
    type: 'course' | 'module' | 'lesson';
    id: string; // Entity ID
    parentId?: string; // Course ID for modules/lessons
    moduleId?: string; // Module ID for lessons
    title: string;
    level?: string;
    audience?: string;
    color?: string;
    icon?: string;
  } | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'course' | 'module' | 'lesson';
    ids: { id1: string, id2?: string, id3?: string };
    isSoftDelete: boolean;
  } | null>(null);


  // --- DND Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Helpers ---
  const activeCourse = useMemo(() => courses.find(c => c.id === activeCourseId), [courses, activeCourseId]);
  const activeModule = useMemo(() => activeCourse?.modules.find(m => m.id === activeModuleId), [activeCourse, activeModuleId]);

  const canModify = (courseId?: string) => {
      if (userRole === 'admin' || userRole === 'methodist') return true;
      // Simple teacher logic: can edit everything if role is teacher (demo purposes)
      return userRole === 'teacher'; 
  };

  useEffect(() => {
    if (initialSelection) {
      if (initialSelection.courseId) {
          setActiveCourseId(initialSelection.courseId);
          setViewLevel('modules');
      }
      if (initialSelection.moduleId) {
          setActiveModuleId(initialSelection.moduleId);
          setViewLevel('lessons');
      }
      if (initialSelection.lessonId && initialSelection.courseId && initialSelection.moduleId) {
          const c = courses.find(c => c.id === initialSelection.courseId);
          const m = c?.modules.find(m => m.id === initialSelection.moduleId);
          const l = m?.lessons.find(l => l.id === initialSelection.lessonId);
          if (l) setSelectedLesson({ courseId: initialSelection.courseId, moduleId: initialSelection.moduleId, lesson: l });
      }
    }
  }, [initialSelection]);

  // --- Handlers ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (viewLevel === 'courses' && onReorderCourse) {
        const oldIdx = courses.findIndex(c => c.id === active.id);
        const newIdx = courses.findIndex(c => c.id === over.id);
        onReorderCourse(oldIdx, newIdx);
    } 
    else if (viewLevel === 'modules' && activeCourseId && onReorderModule) {
        const c = courses.find(c => c.id === activeCourseId);
        if (c) {
            const oldIdx = c.modules.findIndex(m => m.id === active.id);
            const newIdx = c.modules.findIndex(m => m.id === over.id);
            onReorderModule(activeCourseId, oldIdx, newIdx);
        }
    }
    else if (viewLevel === 'lessons' && activeCourseId && activeModuleId && onReorderLesson) {
        const c = courses.find(c => c.id === activeCourseId);
        const m = c?.modules.find(m => m.id === activeModuleId);
        if (m) {
            const oldIdx = m.lessons.findIndex(l => l.id === active.id);
            const newIdx = m.lessons.findIndex(l => l.id === over.id);
            onReorderLesson(activeCourseId, activeModuleId, oldIdx, newIdx);
        }
    }
  };

  const handleBreadcrumb = (level: 'courses' | 'modules') => {
      if (level === 'courses') {
          setViewLevel('courses');
          setActiveCourseId(null);
          setActiveModuleId(null);
          setSelectedLesson(null);
      } else if (level === 'modules') {
          setViewLevel('modules');
          setActiveModuleId(null);
          setSelectedLesson(null);
      }
  };

  const handleMoveCopySubmit = (targetCourseId: string, targetModuleId?: string) => {
      if (!moveCopyDialog) return;
      const { mode, type, sourceId, sourceCourseId, sourceModuleId } = moveCopyDialog;

      if (type === 'lesson' && sourceModuleId && targetModuleId) {
          if (mode === 'copy') {
              onCopyLesson?.(sourceCourseId, sourceModuleId, sourceId, targetCourseId, targetModuleId);
          } else {
              onMoveLessonTo?.(sourceCourseId, sourceModuleId, sourceId, targetCourseId, targetModuleId);
          }
      } else if (type === 'module') {
           if (mode === 'copy') {
               onCopyModule?.(sourceCourseId, sourceId, targetCourseId);
           } else {
               onMoveModuleTo?.(sourceCourseId, sourceId, targetCourseId);
           }
      }
      setMoveCopyDialog(null);
  };

  // AI & Editor Handlers (Simplified for brevity, same logic as before)
  const handleAiAnalyze = async () => { if (!selectedLesson) return; setAiLoading(true); setAiResponse(null); try { const result = await analyzeLessonContent(selectedLesson.lesson, aiMode, aiMode === 'rewrite' ? customPrompt : undefined); setAiResponse(result); } catch (error) { console.error(error); setAiResponse("Failed to analyze lesson."); } finally { setAiLoading(false); } };
  const handleQuizAnswer = (blockId: string, optionIndex: number, correctIndex: number) => { setQuizState(prev => ({ ...prev, [blockId]: { selected: optionIndex, isCorrect: optionIndex === correctIndex } })); };
  const resetQuiz = (blockId: string) => { setQuizState(prev => { const newState = { ...prev }; delete newState[blockId]; return newState; }); };
  const requestDelete = (e: React.MouseEvent, type: 'course' | 'module' | 'lesson', id1: string, id2?: string, id3?: string) => { e.stopPropagation(); const isSoft = userRole === 'teacher' && type === 'lesson'; setDeleteConfirmation({ isOpen: true, type, ids: { id1, id2, id3 }, isSoftDelete: isSoft }); };
  const confirmDelete = () => { if (!deleteConfirmation) return; const { type, ids, isSoftDelete } = deleteConfirmation; if (type === 'course') onDeleteCourse?.(ids.id1); if (type === 'module' && ids.id2) onDeleteModule?.(ids.id1, ids.id2); if (type === 'lesson' && ids.id2 && ids.id3) onDeleteLesson?.(ids.id1, ids.id2, ids.id3, !isSoftDelete); setDeleteConfirmation(null); if(type === 'lesson') setSelectedLesson(null); };

  // Block handlers (Same as original, compacted)
  const handleAddBlock = (type: ContentType, initialContent: string = '') => { if (!selectedLesson) return; let metadata = undefined; if (type === ContentType.QUIZ) metadata = { options: ['Option 1', 'Option 2'], correctIndex: 0 }; const newBlock: ContentBlock = { id: Date.now().toString(), type, content: initialContent || (type === ContentType.TEXT ? 'New text...' : type === ContentType.QUIZ ? 'Question?' : 'https://picsum.photos/600/300'), metadata }; setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: [...selectedLesson.lesson.blocks, newBlock] } }); };
  const handleUpdateBlock = (blockId: string, content: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.map(b => b.id === blockId ? { ...b, content } : b); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const handleDeleteBlock = (blockId: string) => { if (!selectedLesson) return; const updatedBlocks = selectedLesson.lesson.blocks.filter(b => b.id !== blockId); setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks: updatedBlocks } }); };
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => { if (!selectedLesson) return; const blocks = [...selectedLesson.lesson.blocks]; if (direction === 'up' && index > 0) [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]]; else if (direction === 'down' && index < blocks.length - 1) [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]; setSelectedLesson({ ...selectedLesson, lesson: { ...selectedLesson.lesson, blocks } }); };
  const insertFormat = (blockId: string, tag: 'b' | 'i' | 'ul') => { const textarea = document.getElementById(`textarea-${blockId}`) as HTMLTextAreaElement; if (!textarea) return; const { selectionStart: s, selectionEnd: e, value: v } = textarea; const selected = v.substring(s, e); const rep = tag === 'b' ? `<b>${selected}</b>` : tag === 'i' ? `<i>${selected}</i>` : `\n<ul>\n  <li>${selected}</li>\n</ul>\n`; handleUpdateBlock(blockId, v.substring(0, s) + rep + v.substring(e)); };
  const handleQuizOptionChange = (blockId: string, idx: number, val: string) => { if(!selectedLesson) return; const blocks = selectedLesson.lesson.blocks.map(b => b.id !== blockId ? b : { ...b, metadata: { ...b.metadata, options: b.metadata.options.map((o:string, i:number) => i === idx ? val : o) } }); setSelectedLesson({...selectedLesson, lesson: {...selectedLesson.lesson, blocks}}); };
  const addQuizOption = (blockId: string) => { if(!selectedLesson) return; const blocks = selectedLesson.lesson.blocks.map(b => b.id !== blockId ? b : { ...b, metadata: { ...b.metadata, options: [...b.metadata.options, `Option ${b.metadata.options.length + 1}`] } }); setSelectedLesson({...selectedLesson, lesson: {...selectedLesson.lesson, blocks}}); };
  const removeQuizOption = (blockId: string, idx: number) => { if(!selectedLesson) return; const blocks = selectedLesson.lesson.blocks.map(b => b.id !== blockId ? b : { ...b, metadata: { ...b.metadata, options: b.metadata.options.filter((_:any, i:number) => i !== idx) } }); setSelectedLesson({...selectedLesson, lesson: {...selectedLesson.lesson, blocks}}); };
  const setQuizCorrectAnswer = (blockId: string, idx: number) => { if(!selectedLesson) return; const blocks = selectedLesson.lesson.blocks.map(b => b.id !== blockId ? b : { ...b, metadata: { ...b.metadata, correctIndex: idx } }); setSelectedLesson({...selectedLesson, lesson: {...selectedLesson.lesson, blocks}}); };
  const handleImageUpload = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => handleUpdateBlock(blockId, reader.result as string); reader.readAsDataURL(file); };
  const handleImportDoc = () => fileInputRef.current?.click();
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setIsConverting(true); const reader = new FileReader(); reader.onload = async (ev) => { try { const mammoth = (await import('mammoth')).default; const res = await mammoth.convertToHtml({ arrayBuffer: ev.target?.result as ArrayBuffer }); handleAddBlock(ContentType.TEXT, res.value); } finally { setIsConverting(false); if(fileInputRef.current) fileInputRef.current.value = ''; } }; reader.readAsArrayBuffer(file); };
  const handleSaveContent = () => { if (selectedLesson && onUpdateLesson) { onUpdateLesson(selectedLesson.courseId, selectedLesson.moduleId, selectedLesson.lesson, t.logs.contentUpdated); setIsEditingContent(false); } };
  
  const submitEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;
      if (editingItem.type === 'course') onUpdateCourse?.(editingItem.id, editingItem.title, editingItem.level || levels[0], editingItem.audience || audiences[0], editingItem.color, editingItem.icon);
      if (editingItem.type === 'module' && editingItem.parentId) onRenameModule?.(editingItem.parentId, editingItem.id, editingItem.title);
      if (editingItem.type === 'lesson' && editingItem.parentId && editingItem.moduleId) onRenameLesson?.(editingItem.parentId, editingItem.moduleId, editingItem.id, editingItem.title);
      setEditingItem(null);
  };

  // --- RENDERERS ---

  const renderBreadcrumbs = () => (
      <div className="flex items-center gap-2 text-sm mb-6 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
          <button onClick={() => handleBreadcrumb('courses')} className="font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              <BookOpen size={16} /> {t.courses}
          </button>
          {activeCourse && (
              <>
                  <ChevronRight size={14} className="text-slate-300" />
                  <button onClick={() => handleBreadcrumb('modules')} className={`font-bold transition-colors flex items-center gap-1 ${viewLevel === 'modules' ? 'text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}>
                      {activeCourse.title}
                  </button>
              </>
          )}
          {activeModule && (
              <>
                  <ChevronRight size={14} className="text-slate-300" />
                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                      {activeModule.title}
                  </span>
              </>
          )}
          
          <div className="ml-auto flex items-center gap-2">
               <button 
                  onClick={() => setShowStats(true)} 
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Statistics"
               >
                   <BarChart3 size={18} />
               </button>
          </div>
      </div>
  );

  const renderCoursesGrid = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={courses.map(c => c.id)} strategy={rectSortingStrategy}>
                  {courses.map(course => {
                      const tileColor = COURSE_COLORS.find(c => course.color?.includes(c.name))?.class || course.color || 'bg-white border-slate-200';
                      const lessonCount = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
                      const IconComponent = COURSE_ICONS.find(i => i.name === course.icon)?.icon || BookOpen;

                      return (
                          <SortableItem key={course.id} id={course.id} disabled={!canModify()}>
                              <div 
                                  onClick={() => { setActiveCourseId(course.id); setViewLevel('modules'); }}
                                  className={`h-48 rounded-2xl p-6 relative group cursor-pointer transition-all border ${tileColor} hover:shadow-lg hover:-translate-y-1`}
                              >
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="bg-white/80 p-2 rounded-xl backdrop-blur-sm shadow-sm text-slate-700">
                                          <IconComponent size={24} />
                                      </div>
                                      {canModify(course.id) && (
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg shadow-sm flex" onClick={e => e.stopPropagation()}>
                                              <button onClick={() => setEditingItem({ type: 'course', id: course.id, title: course.title, level: course.level, audience: course.targetAudience, color: course.color, icon: course.icon })} className="p-2 hover:text-indigo-600"><PenLine size={16} /></button>
                                              <button onClick={(e) => requestDelete(e, 'course', course.id)} className="p-2 hover:text-red-600"><Trash2 size={16} /></button>
                                          </div>
                                      )}
                                  </div>
                                  
                                  <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-2">{course.title}</h3>
                                  <div className="flex gap-2 text-xs font-semibold opacity-70 mb-4">
                                      <span>{course.level}</span> • <span>{course.targetAudience}</span>
                                  </div>
                                  
                                  <div className="absolute bottom-6 left-6 flex gap-4 text-sm font-medium opacity-60">
                                      <span className="flex items-center gap-1"><FolderClosed size={16} /> {course.modules.length}</span>
                                      <span className="flex items-center gap-1"><FileText size={16} /> {lessonCount}</span>
                                  </div>
                              </div>
                          </SortableItem>
                      );
                  })}
              </SortableContext>
          </DndContext>
          {canModify() && (
              <button 
                  onClick={onAddCourse}
                  className="h-48 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all gap-2"
              >
                  <Plus size={32} />
                  <span className="font-bold">{t.addCourse}</span>
              </button>
          )}
      </div>
  );

  const renderModulesGrid = () => {
      if (!activeCourse) return null;
      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeCourse.modules.map(m => m.id)} strategy={rectSortingStrategy}>
                      {activeCourse.modules.map(module => (
                          <SortableItem key={module.id} id={module.id} disabled={!canModify(activeCourseId!)}>
                              <div 
                                  onClick={() => { setActiveModuleId(module.id); setViewLevel('lessons'); }}
                                  className="h-40 bg-white border border-slate-200 rounded-2xl p-6 relative group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                              >
                                  <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                          <FolderClosed size={24} className="text-indigo-400" />
                                          <h4 className="font-bold text-slate-700 line-clamp-1">{module.title}</h4>
                                      </div>
                                      {canModify(activeCourseId!) && (
                                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex" onClick={e => e.stopPropagation()}>
                                               <button onClick={() => setMoveCopyDialog({ isOpen: true, mode: 'move', type: 'module', sourceId: module.id, sourceCourseId: activeCourse.id })} className="p-1.5 hover:text-amber-600"><Move size={14} /></button>
                                               <button onClick={() => setMoveCopyDialog({ isOpen: true, mode: 'copy', type: 'module', sourceId: module.id, sourceCourseId: activeCourse.id })} className="p-1.5 hover:text-emerald-600"><Copy size={14} /></button>
                                               <button onClick={() => setEditingItem({ type: 'module', id: module.id, parentId: activeCourse.id, title: module.title })} className="p-1.5 hover:text-indigo-600"><PenLine size={14} /></button>
                                               <button onClick={(e) => requestDelete(e, 'module', activeCourse.id, module.id)} className="p-1.5 hover:text-red-600"><Trash2 size={14} /></button>
                                           </div>
                                      )}
                                  </div>
                                  <div className="text-sm text-slate-500 font-medium">
                                      {module.lessons.length} {t.totalLessons}
                                  </div>
                              </div>
                          </SortableItem>
                      ))}
                  </SortableContext>
              </DndContext>
              {canModify(activeCourseId!) && (
                  <button 
                      onClick={() => onAddModule && onAddModule(activeCourse.id)}
                      className="h-40 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all gap-2"
                  >
                      <Plus size={24} />
                      <span className="font-bold">{t.addModule}</span>
                  </button>
              )}
          </div>
      );
  };

  const renderLessonsView = () => {
      if (!activeCourse || !activeModule) return null;
      return (
          <div className="flex h-full gap-4 overflow-hidden relative">
              {/* Lesson List */}
              <div className="w-80 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden flex-shrink-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                      <span>{t.lessonPlan}</span>
                      {canModify(activeCourseId!) && (
                          <button onClick={() => onAddLesson && onAddLesson(activeCourse.id, activeModule.id)} className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"><Plus size={16} /></button>
                      )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={activeModule.lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                              {activeModule.lessons.map(lesson => (
                                  <SortableItem key={lesson.id} id={lesson.id} disabled={!canModify(activeCourseId!)}>
                                      <div 
                                          onClick={() => setSelectedLesson({ courseId: activeCourse.id, moduleId: activeModule.id, lesson })}
                                          className={`p-3 rounded-lg border text-sm cursor-pointer transition-all relative group ${selectedLesson?.lesson.id === lesson.id ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-medium' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                                      >
                                          <div className="flex items-center justify-between">
                                              <span className="truncate pr-8">{lesson.title}</span>
                                              {lesson.status === 'published' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                                          </div>
                                          {canModify(activeCourseId!) && (
                                              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex bg-white/90 shadow-sm rounded border border-slate-100" onClick={e => e.stopPropagation()}>
                                                  <button onClick={() => setMoveCopyDialog({ isOpen: true, mode: 'move', type: 'lesson', sourceId: lesson.id, sourceCourseId: activeCourse.id, sourceModuleId: activeModule.id })} className="p-1 hover:text-amber-600"><Move size={12} /></button>
                                                  <button onClick={() => setMoveCopyDialog({ isOpen: true, mode: 'copy', type: 'lesson', sourceId: lesson.id, sourceCourseId: activeCourse.id, sourceModuleId: activeModule.id })} className="p-1 hover:text-emerald-600"><Copy size={12} /></button>
                                                  <button onClick={() => setEditingItem({ type: 'lesson', id: lesson.id, parentId: activeCourse.id, moduleId: activeModule.id, title: lesson.title })} className="p-1 hover:text-indigo-600"><PenLine size={12} /></button>
                                                  <button onClick={(e) => requestDelete(e, 'lesson', activeCourse.id, activeModule.id, lesson.id)} className="p-1 hover:text-red-600"><Trash2 size={12} /></button>
                                              </div>
                                          )}
                                      </div>
                                  </SortableItem>
                              ))}
                          </SortableContext>
                      </DndContext>
                  </div>
              </div>

              {/* Editor */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col relative">
                  {selectedLesson ? (
                      <>
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                               <h2 className="font-bold text-lg text-slate-800 flex items-center gap-3">
                                   {selectedLesson.lesson.title}
                                   {canModify(activeCourseId!) && (
                                       <button 
                                          onClick={() => setShowAiPanel(!showAiPanel)}
                                          className={`p-2 rounded-lg transition-colors ${showAiPanel ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-50 text-slate-500'}`}
                                          title="AI Assistant"
                                       >
                                           <Sparkles size={18} />
                                       </button>
                                   )}
                               </h2>
                               <div className="flex gap-2">
                                  {canModify(activeCourseId!) && (
                                      !isEditingContent ? (
                                          <button onClick={() => setIsEditingContent(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
                                              <Edit3 size={16} /> {t.edit}
                                          </button>
                                      ) : (
                                          <button onClick={handleSaveContent} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">
                                              <CheckCircle size={16} /> {t.saveChanges}
                                          </button>
                                      )
                                  )}
                               </div>
                          </div>
                          <div className="flex flex-1 overflow-hidden">
                              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                  {/* Reusing block rendering logic from original, but simplified for XML brevity */}
                                  {selectedLesson.lesson.blocks.map((block, idx) => (
                                      <div key={block.id} className="relative group">
                                          {isEditingContent && (
                                              <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-center gap-2 opacity-50 group-hover:opacity-100">
                                                  <button onClick={() => handleMoveBlock(idx, 'up')} className="hover:text-indigo-600"><ArrowUp size={14} /></button>
                                                  <button onClick={() => handleDeleteBlock(block.id)} className="hover:text-red-600"><Trash2 size={14} /></button>
                                                  <button onClick={() => handleMoveBlock(idx, 'down')} className="hover:text-indigo-600"><ArrowDown size={14} /></button>
                                              </div>
                                          )}
                                          {isEditingContent ? (
                                              <div className="border border-indigo-100 rounded-lg p-2 bg-indigo-50/30">
                                                  {block.type === ContentType.TEXT ? (
                                                      <>
                                                          <div className="flex gap-1 mb-2 border-b border-indigo-100 pb-1">
                                                              <button onClick={() => insertFormat(block.id, 'b')} className="p-1 hover:bg-white rounded"><Bold size={14}/></button>
                                                              <button onClick={() => insertFormat(block.id, 'i')} className="p-1 hover:bg-white rounded"><Italic size={14}/></button>
                                                              <button onClick={() => insertFormat(block.id, 'ul')} className="p-1 hover:bg-white rounded"><List size={14}/></button>
                                                          </div>
                                                          <textarea id={`textarea-${block.id}`} value={block.content} onChange={e => handleUpdateBlock(block.id, e.target.value)} className="w-full h-24 p-2 text-sm bg-white border-none focus:ring-0" />
                                                      </>
                                                  ) : (
                                                      <input type="text" value={block.content} onChange={e => handleUpdateBlock(block.id, e.target.value)} className="w-full p-2 border rounded text-sm" />
                                                  )}
                                              </div>
                                          ) : (
                                              <div className="prose max-w-none text-slate-900">
                                                  {block.type === ContentType.TEXT && <div dangerouslySetInnerHTML={{ __html: block.content }} />}
                                                  {block.type === ContentType.IMAGE && <img src={block.content} className="rounded-lg shadow-sm max-h-80" />}
                                                  {block.type === ContentType.QUIZ && (
                                                      <div className="bg-slate-50 p-4 rounded-lg border">
                                                          <div className="font-bold mb-2">{block.content}</div>
                                                          {block.metadata?.options?.map((opt:string, i:number) => (
                                                              <div key={i} onClick={() => !quizState[block.id] && handleQuizAnswer(block.id, i, block.metadata.correctIndex)} className={`p-2 border rounded mt-1 cursor-pointer ${quizState[block.id]?.selected === i ? (quizState[block.id]?.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'hover:bg-white'}`}>
                                                                  {opt}
                                                              </div>
                                                          ))}
                                                          {quizState[block.id] && <button onClick={() => resetQuiz(block.id)} className="text-xs text-indigo-600 mt-2 flex items-center gap-1"><RefreshCw size={12}/> Retry</button>}
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                              
                              {/* AI Sidebar Panel */}
                              {showAiPanel && (
                                  <div className="w-80 border-l border-slate-200 bg-white shadow-xl flex flex-col animate-slide-in-right z-10">
                                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                                          <div className="flex items-center gap-2 text-indigo-700 font-bold">
                                              <Sparkles size={18} />
                                              AI Assistant
                                          </div>
                                          <button onClick={() => setShowAiPanel(false)}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
                                      </div>
                                      <div className="flex-1 overflow-hidden">
                                          <AIArchitect />
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          {isEditingContent && (
                              <div className="p-4 border-t bg-slate-50 flex gap-2 overflow-x-auto">
                                  <button onClick={() => handleAddBlock(ContentType.TEXT)} className="px-3 py-2 bg-white border rounded text-sm flex gap-1 items-center"><FileText size={16}/> Text</button>
                                  <button onClick={() => handleAddBlock(ContentType.IMAGE)} className="px-3 py-2 bg-white border rounded text-sm flex gap-1 items-center"><ImageIcon size={16}/> Image</button>
                                  <button onClick={() => handleAddBlock(ContentType.QUIZ)} className="px-3 py-2 bg-white border rounded text-sm flex gap-1 items-center"><CheckCircle size={16}/> Quiz</button>
                                  <div className="border-l mx-1"></div>
                                  <button onClick={handleImportDoc} disabled={isConverting} className="px-3 py-2 bg-indigo-50 border-indigo-200 text-indigo-700 border rounded text-sm flex gap-1 items-center">{isConverting ? <Loader2 size={16} className="animate-spin"/> : <FileUp size={16}/>} Import Word</button>
                                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".docx" className="hidden" />
                              </div>
                          )}
                      </>
                  ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400">
                          <p>Select a lesson to view or edit</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
        {renderBreadcrumbs()}
        <div className="flex-1 overflow-y-auto">
            {viewLevel === 'courses' && renderCoursesGrid()}
            {viewLevel === 'modules' && renderModulesGrid()}
            {viewLevel === 'lessons' && renderLessonsView()}
        </div>

        {/* Move/Copy Modal */}
        {moveCopyDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <MoveCopyModal 
                    isOpen={moveCopyDialog.isOpen}
                    mode={moveCopyDialog.mode}
                    type={moveCopyDialog.type}
                    courses={courses}
                    onClose={() => setMoveCopyDialog(null)}
                    onSubmit={handleMoveCopySubmit}
                />
            </div>
        )}

        {/* Stats Modal */}
        {showStats && (
            <div className="fixed inset-0 bg-black/50 flex justify-end z-50 transition-opacity" onClick={() => setShowStats(false)}>
                <div className="w-[400px] bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BarChart3 /> {t.statistics}</h2>
                        <button onClick={() => setShowStats(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                    </div>
                    <StatsPanel user={user} activityLog={activityLog} />
                </div>
            </div>
        )}

        {/* Edit Modal (Generic) */}
        {editingItem && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
                    <h3 className="text-lg font-bold mb-4">{t.edit} {t.targetTypes[editingItem.type as keyof typeof t.targetTypes]}</h3>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.title}</label>
                            <input autoFocus type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {editingItem.type === 'course' && (
                            <>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.color}</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COURSE_COLORS.map(c => (
                                            <button type="button" key={c.name} onClick={() => setEditingItem({...editingItem, color: c.class})} className={`w-8 h-8 rounded-full border-2 ${c.class.replace('bg-', 'bg-').split(' ')[0]} ${editingItem.color === c.class ? 'ring-2 ring-offset-2 ring-slate-400 border-white' : 'border-transparent'}`}></button>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.icon}</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COURSE_ICONS.map(i => (
                                            <button type="button" key={i.name} onClick={() => setEditingItem({...editingItem, icon: i.name})} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${editingItem.icon === i.name ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                                <i.icon size={16} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.level}</label><select value={editingItem.level} onChange={e => setEditingItem({...editingItem, level: e.target.value})} className="w-full p-2 border rounded">{levels.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.targetAudience}</label><select value={editingItem.audience} onChange={e => setEditingItem({...editingItem, audience: e.target.value})} className="w-full p-2 border rounded">{audiences.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                            </>
                        )}
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-slate-600">{t.cancel}</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{t.saveChanges}</button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
                    <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle /> {t.delete}</h3>
                    <p className="text-slate-600 mb-6">{deleteConfirmation.isSoftDelete ? "Soft delete?" : t.confirmDelete}</p>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 text-slate-600">{t.cancel}</button>
                        <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">{t.delete}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// --- Sub-components for Modals ---

const MoveCopyModal: React.FC<{
    isOpen: boolean;
    mode: 'move' | 'copy';
    type: 'lesson' | 'module';
    courses: Course[];
    onClose: () => void;
    onSubmit: (targetCourseId: string, targetModuleId?: string) => void;
}> = ({ isOpen, mode, type, courses, onClose, onSubmit }) => {
    const [targetCourseId, setTargetCourseId] = useState(courses[0]?.id || '');
    const [targetModuleId, setTargetModuleId] = useState('');
    
    const targetCourse = courses.find(c => c.id === targetCourseId);
    
    // Auto-select first module when course changes
    useEffect(() => {
        if (targetCourse?.modules.length) {
            setTargetModuleId(targetCourse.modules[0].id);
        } else {
            setTargetModuleId('');
        }
    }, [targetCourse]);

    if (!isOpen) return null;

    return (
        <div className="bg-white rounded-xl p-6 w-96 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 capitalize">{mode} {type}</h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Course</label>
                    <select 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                        value={targetCourseId}
                        onChange={e => setTargetCourseId(e.target.value)}
                    >
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {type === 'lesson' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Module</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            value={targetModuleId}
                            onChange={e => setTargetModuleId(e.target.value)}
                            disabled={!targetCourse?.modules.length}
                        >
                            {targetCourse?.modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                        {!targetCourse?.modules.length && <p className="text-xs text-red-500 mt-1">No modules in selected course.</p>}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button 
                    onClick={() => onSubmit(targetCourseId, targetModuleId)}
                    disabled={type === 'lesson' && !targetModuleId}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {mode === 'copy' ? 'Copy' : 'Move'}
                </button>
            </div>
        </div>
    );
};

const StatsPanel: React.FC<{ user: User; activityLog: ActivityLogEntry[] }> = ({ user, activityLog }) => {
    const { t } = useLanguage();
    // Logic: 
    // Teacher -> sees only their own actions count
    // Admin/Methodist -> sees breakdown by user
    
    const stats = useMemo(() => {
        const filtered = user.role === 'teacher' 
            ? activityLog.filter(l => l.userId === user.id)
            : activityLog;

        const created = filtered.filter(l => l.action === 'create').length;
        const updated = filtered.filter(l => l.action === 'update' || l.action === 'rename').length;
        const deleted = filtered.filter(l => l.action === 'delete').length;
        
        // Group by user for admins
        const userStats: Record<string, { name: string, created: number, updated: number, deleted: number }> = {};
        if (user.role !== 'teacher') {
            filtered.forEach(log => {
                if (!userStats[log.userId]) {
                    userStats[log.userId] = { name: log.userName, created: 0, updated: 0, deleted: 0 };
                }
                if (log.action === 'create') userStats[log.userId].created++;
                else if (log.action === 'delete') userStats[log.userId].deleted++;
                else if (log.action === 'update' || log.action === 'rename') userStats[log.userId].updated++;
            });
        }

        return { created, updated, deleted, userStats };
    }, [activityLog, user]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{stats.created}</div>
                    <div className="text-xs text-green-600 font-medium">{t.createdCount}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{stats.updated}</div>
                    <div className="text-xs text-blue-600 font-medium">{t.editedCount}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                    <div className="text-2xl font-bold text-red-700">{stats.deleted}</div>
                    <div className="text-xs text-red-600 font-medium">{t.deletedCount}</div>
                </div>
            </div>

            {user.role !== 'teacher' && (
                <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">{t.teamPerformance}</h4>
                    <div className="space-y-3">
                        {Object.values(stats.userStats).map((u, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="font-bold text-slate-800 text-sm mb-2">{u.name}</div>
                                <div className="flex gap-2 text-xs">
                                    <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded">+{u.created}</span>
                                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">~{u.updated}</span>
                                    <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded">-{u.deleted}</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.userStats).length === 0 && <p className="text-slate-400 text-sm">{t.noActivity}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
