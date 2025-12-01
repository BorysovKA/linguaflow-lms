
import React, { useState } from 'react';
import { Course, ContentBlock, ContentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { generateAssessment, sendMessageToArchitect } from '../services/geminiService';
import { CheckSquare, Square, ChevronRight, ChevronDown, Sparkles, Save, RefreshCw, Copy, Plus, Trash2 } from 'lucide-react';

interface TestBuilderProps {
  courses: Course[];
  onSaveAsLesson: (courseId: string, moduleId: string, lessonTitle: string, blocks: ContentBlock[]) => void;
}

export const TestBuilder: React.FC<TestBuilderProps> = ({ courses, onSaveAsLesson }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]); // Array of Lesson IDs
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Config
  const [testType, setTestType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [targetLevel, setTargetLevel] = useState('A2');
  
  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<ContentBlock[]>([]);
  const [saveDialog, setSaveDialog] = useState<{ isOpen: boolean; courseId: string; moduleId: string; title: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelection = (lessonId: string) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const handleGenerate = async () => {
    if (selectedLessons.length === 0) return;
    setIsGenerating(true);
    setStep(3); // Move to results view immediately with loading state

    // Gather content
    let aggregatedContent = "";
    courses.forEach(c => c.modules.forEach(m => m.lessons.forEach(l => {
        if (selectedLessons.includes(l.id)) {
            aggregatedContent += `Lesson: ${l.title}\n`;
            l.blocks.forEach(b => {
                if (b.type === ContentType.TEXT || b.type === ContentType.QUIZ) {
                    aggregatedContent += `${b.content}\n`;
                }
            });
        }
    })));

    const result = await generateAssessment(aggregatedContent, {
        type: testType,
        count: questionCount,
        level: targetLevel
    });

    // Add IDs to blocks
    const blocksWithIds = result.blocks.map(b => ({
        ...b,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5)
    }));

    setGeneratedBlocks(blocksWithIds);
    setIsGenerating(false);
  };

  const handleRegenerateBlock = async (blockId: string, currentContent: string) => {
      const blockIndex = generatedBlocks.findIndex(b => b.id === blockId);
      if (blockIndex === -1) return;

      // Update UI to show loading for this specific block
      const tempBlocks = [...generatedBlocks];
      tempBlocks[blockIndex] = { ...tempBlocks[blockIndex], content: "Regenerating..." };
      setGeneratedBlocks(tempBlocks);

      // Call AI
      const prompt = `Rewrite this specific test question to be different but test similar knowledge: "${currentContent}"`;
      const response = await sendMessageToArchitect(prompt);

      // Update with new content
      tempBlocks[blockIndex] = { ...generatedBlocks[blockIndex], content: response };
      setGeneratedBlocks(tempBlocks);
  };

  const updateBlockContent = (id: string, content: string) => {
      setGeneratedBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const handleSaveSubmit = () => {
      if (!saveDialog) return;
      onSaveAsLesson(saveDialog.courseId, saveDialog.moduleId, saveDialog.title, generatedBlocks);
      setSaveDialog(null);
      // Reset or navigate away
  };

  return (
    <div className="h-full flex gap-6 p-1">
      {/* Left Sidebar - Steps & Config */}
      <div className="w-80 flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Step 1: Selection */}
        <div className={`bg-white rounded-xl border p-4 transition-all ${step === 1 ? 'border-indigo-500 shadow-md' : 'border-slate-200'}`}>
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                {t.tbSelectContent}
            </h3>
            {step === 1 && (
                <div className="mt-4 space-y-2">
                    {courses.map(course => (
                        <div key={course.id} className="border border-slate-100 rounded-lg overflow-hidden">
                            <div 
                                className="flex items-center gap-2 p-2 bg-slate-50 cursor-pointer hover:bg-slate-100"
                                onClick={() => toggleExpand(course.id)}
                            >
                                {expandedItems[course.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span className="text-sm font-medium truncate">{course.title}</span>
                            </div>
                            {expandedItems[course.id] && (
                                <div className="pl-4 pr-2 py-2 space-y-2">
                                    {course.modules.map(module => (
                                        <div key={module.id}>
                                            <div className="text-xs font-bold text-slate-400 mb-1">{module.title}</div>
                                            {module.lessons.map(lesson => {
                                                const isSelected = selectedLessons.includes(lesson.id);
                                                return (
                                                    <div 
                                                        key={lesson.id} 
                                                        className="flex items-center gap-2 py-1 cursor-pointer group"
                                                        onClick={() => toggleSelection(lesson.id)}
                                                    >
                                                        {isSelected ? <CheckSquare size={14} className="text-indigo-600"/> : <Square size={14} className="text-slate-300 group-hover:text-indigo-400"/>}
                                                        <span className={`text-sm ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{lesson.title}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="text-xs text-right text-slate-400 mt-2">{selectedLessons.length} lessons selected</div>
                </div>
            )}
        </div>

        {/* Step 2: Config */}
        <div className={`bg-white rounded-xl border p-4 transition-all ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
             <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
                {t.tbConfigure}
            </h3>
            <div className="space-y-4 mt-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.tbTestType}</label>
                    <select value={testType} onChange={e => setTestType(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                        <option value="mixed">{t.tbTypeMixed}</option>
                        <option value="reading">{t.tbTypeReading}</option>
                        <option value="writing">{t.tbTypeWriting}</option>
                        <option value="vocab">{t.tbTypeVocab}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Level</label>
                    <select value={targetLevel} onChange={e => setTargetLevel(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                        <option value="A1">A1 (Beginner)</option>
                        <option value="A2">A2 (Elementary)</option>
                        <option value="B1">B1 (Intermediate)</option>
                        <option value="B2">B2 (Upper)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.tbQuestionCount}</label>
                    <input type="number" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" min={1} max={20} />
                </div>
                
                <button 
                    onClick={handleGenerate}
                    disabled={selectedLessons.length === 0 || isGenerating}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Sparkles size={18} />
                    {t.tbGenerate}
                </button>
            </div>
        </div>
      </div>

      {/* Main Area - Result */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">{t.tbResults}</h2>
              {generatedBlocks.length > 0 && !isGenerating && (
                  <button 
                    onClick={() => setSaveDialog({ isOpen: true, courseId: courses[0]?.id || '', moduleId: '', title: `Test: ${testType} (${new Date().toLocaleDateString()})` })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                      <Save size={16} /> {t.tbSaveAsLesson}
                  </button>
              )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm animate-bounce">
                          <Sparkles size={32} className="text-indigo-500" />
                      </div>
                      <p>{t.tbGenerating}</p>
                  </div>
              ) : generatedBlocks.length > 0 ? (
                  <div className="space-y-6 max-w-3xl mx-auto">
                      {generatedBlocks.map((block, idx) => (
                          <div key={block.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group relative">
                              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button onClick={() => handleRegenerateBlock(block.id, block.content)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded" title={t.tbRegenerate}>
                                      <RefreshCw size={14} />
                                  </button>
                                  <button onClick={() => setGeneratedBlocks(prev => prev.filter(b => b.id !== block.id))} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded">
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                              
                              <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{block.type} Question {idx + 1}</div>
                              
                              {block.type === ContentType.TEXT ? (
                                  <textarea 
                                    value={block.content}
                                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                    className="w-full p-2 border-none focus:ring-0 resize-none text-slate-800"
                                    rows={3}
                                  />
                              ) : (
                                  <div>
                                      <input 
                                        type="text" 
                                        value={block.content}
                                        onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                        className="w-full font-medium text-slate-800 border-none focus:ring-0 mb-2"
                                      />
                                      <div className="space-y-1 ml-4">
                                          {block.metadata?.options?.map((opt: string, i: number) => (
                                              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                  <div className="w-4 h-4 border rounded-full flex items-center justify-center">
                                                      {i === block.metadata?.correctIndex && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                                  </div>
                                                  <input type="text" defaultValue={opt} className="bg-transparent border-none p-0 focus:ring-0 w-full" />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                      
                      <button 
                        onClick={() => setGeneratedBlocks([...generatedBlocks, { id: Date.now().toString(), type: ContentType.TEXT, content: "New question..." }])}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2"
                      >
                          <Plus size={18} /> Add Question Manually
                      </button>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Sparkles size={48} className="mb-4 opacity-20" />
                      <p>Select content and click generate to start.</p>
                  </div>
              )}
          </div>
      </div>

      {/* Save Dialog */}
      {saveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
                  <h3 className="font-bold text-lg mb-4">{t.tbSaveAsLesson}</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Target Course</label>
                          <select 
                            value={saveDialog.courseId} 
                            onChange={e => setSaveDialog({...saveDialog, courseId: e.target.value})}
                            className="w-full p-2 border rounded"
                          >
                              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Target Module</label>
                          <select 
                            value={saveDialog.moduleId} 
                            onChange={e => setSaveDialog({...saveDialog, moduleId: e.target.value})}
                            className="w-full p-2 border rounded"
                          >
                              <option value="">Select Module...</option>
                              {courses.find(c => c.id === saveDialog.courseId)?.modules.map(m => (
                                  <option key={m.id} value={m.id}>{m.title}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Lesson Title</label>
                          <input 
                            type="text" 
                            value={saveDialog.title} 
                            onChange={e => setSaveDialog({...saveDialog, title: e.target.value})}
                            className="w-full p-2 border rounded"
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setSaveDialog(null)} className="px-4 py-2 text-slate-600">{t.cancel}</button>
                      <button onClick={handleSaveSubmit} disabled={!saveDialog.moduleId} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
