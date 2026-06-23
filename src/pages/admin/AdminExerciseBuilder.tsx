import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertCircle, 
  HelpCircle, 
  Trash, 
  Check, 
  X, 
  FolderLock, 
  CheckSquare, 
  CircleDot, 
  AlignLeft, 
  FileEdit,
  Save
} from 'lucide-react';
import { 
  useAdminData, 
  Major, 
  Chapter, 
  Lesson, 
  Slide, 
  Exercise 
} from '../../hooks/useAdminData';

export default function AdminExerciseBuilder() {
  const { 
    loading, 
    error, 
    fetchMajors, 
    fetchChapters, 
    fetchLessons, 
    fetchSlides, 
    fetchExercisesForSlide, 
    saveExercise, 
    deleteExercise 
  } = useAdminData();

  // Selection hierarchy
  const [majors, setMajors] = useState<Major[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [selectedMajorId, setSelectedMajorId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedSlideId, setSelectedSlideId] = useState('');

  // Active builder form state
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [qType, setQType] = useState<'single_choice' | 'multiple_choice' | 'short_answer' | 'paragraph'>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['Option A', 'Option B']);
  const [correctAnswersList, setCorrectAnswersList] = useState<number[]>([]); // indexes for multiple/single choice
  const [shortAnswerMatch, setShortAnswerMatch] = useState('');

  // Initial load
  useEffect(() => {
    fetchMajors().then(setMajors);
  }, [fetchMajors]);

  // Major change -> trigger Chapters fetch
  const handleMajorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedMajorId(id);
    setSelectedChapterId('');
    setSelectedLessonId('');
    setSelectedSlideId('');
    setChapters([]);
    setLessons([]);
    setSlides([]);
    setExercises([]);
    resetForm();

    if (id) {
      const data = await fetchChapters(id);
      setChapters(data);
    }
  };

  // Chapter change -> trigger Lessons fetch
  const handleChapterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedChapterId(id);
    setSelectedLessonId('');
    setSelectedSlideId('');
    setLessons([]);
    setSlides([]);
    setExercises([]);
    resetForm();

    if (id) {
      const data = await fetchLessons(id);
      setLessons(data);
    }
  };

  // Lesson change -> trigger Slides fetch
  const handleLessonChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedLessonId(id);
    setSelectedSlideId('');
    setSlides([]);
    setExercises([]);
    resetForm();

    if (id) {
      const data = await fetchSlides(id);
      setSlides(data);
    }
  };

  // Slide change -> trigger Exercises fetch
  const handleSlideChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSlideId(id);
    setExercises([]);
    resetForm();

    if (id) {
      const data = await fetchExercisesForSlide(id);
      setExercises(data);
    }
  };

  const resetForm = () => {
    setEditingExercise(null);
    setIsCreatingNew(false);
    setQuestionText('');
    setOptions(['Option A', 'Option B']);
    setCorrectAnswersList([0]);
    setShortAnswerMatch('');
    setQType('single_choice');
  };

  const initiateNewForm = () => {
    resetForm();
    setIsCreatingNew(true);
  };

  const populateFormForEdit = (ex: Exercise) => {
    resetForm();
    setEditingExercise(ex);
    setQType(ex.type as any);
    setQuestionText(ex.question_data.question || '');
    setOptions(ex.question_data.options || ['Option A', 'Option B']);
    
    // Parse correctness criteria nicely based on schema definitions
    if (ex.type === 'single_choice') {
      const correctIndex = Number(ex.question_data.correct_answer);
      setCorrectAnswersList(isNaN(correctIndex) ? [0] : [correctIndex]);
    } else if (ex.type === 'multiple_choice') {
      const correctIndices = Array.isArray(ex.question_data.correct_answer) 
        ? ex.question_data.correct_answer.map(Number) 
        : [Number(ex.question_data.correct_answer)];
      setCorrectAnswersList(correctIndices);
    } else if (ex.type === 'short_answer') {
      setShortAnswerMatch(String(ex.question_data.correct_answer || ''));
    }
  };

  // Dynamic Options mutations
  const handleAddOption = () => {
    setOptions(prev => [...prev, `Option ${String.fromCharCode(65 + prev.length)}`]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 1) return;
    setOptions(prev => prev.filter((_, i) => i !== indexToRemove));
    setCorrectAnswersList(prev => prev
      .filter(val => val !== indexToRemove)
      .map(val => val > indexToRemove ? val - 1 : val)
    );
  };

  const handleOptionTextChange = (idx: number, text: string) => {
    setOptions(prev => prev.map((opt, i) => i === idx ? text : opt));
  };

  // Single choice toggle (radio effect)
  const toggleSingleChoiceCorrectness = (idx: number) => {
    setCorrectAnswersList([idx]);
  };

  // Multiple choice toggle (checkbox effect)
  const toggleMultipleChoiceCorrectness = (idx: number) => {
    if (correctAnswersList.includes(idx)) {
      setCorrectAnswersList(prev => prev.filter(v => v !== idx));
    } else {
      setCorrectAnswersList(prev => [...prev, idx].sort((a, b) => a - b));
    }
  };

  // Form persistence submit to Supabase JSONB
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlideId || !questionText.trim()) return;

    let correctAnswerResult: any = null;
    if (qType === 'single_choice') {
      correctAnswerResult = correctAnswersList[0] ?? 0;
    } else if (qType === 'multiple_choice') {
      correctAnswerResult = correctAnswersList;
    } else if (qType === 'short_answer') {
      correctAnswerResult = shortAnswerMatch.trim();
    }

    const question_data = {
      question: questionText,
      options: ['single_choice', 'multiple_choice'].includes(qType) ? options : undefined,
      correct_answer: correctAnswerResult,
    };

    const exId = editingExercise ? editingExercise.id : null;
    const result = await saveExercise(exId, selectedSlideId, qType, question_data);

    if (result) {
      if (exId) {
        setExercises(prev => prev.map(ex => ex.id === exId ? result : ex));
      } else {
        setExercises(prev => [...prev, result]);
      }
      resetForm();
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (window.confirm("Verify: Are you absolutely sure you want to permanently delete this exercise? This will erase all connected user answers constraint histories!")) {
      const ok = await deleteExercise(id);
      if (ok) {
        setExercises(prev => prev.filter(ex => ex.id !== id));
        if (editingExercise?.id === id) {
          resetForm();
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <section>
        <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
          Dynamic <span className="text-indigo-500">Exercise Builder</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          Attach structured assessment questionnaires to specific syllabus slides
        </p>
      </section>

      {/* Target selector matrix */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 shadow-sm relative overflow-hidden">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Major Matrix</label>
          <select 
            value={selectedMajorId}
            onChange={handleMajorChange}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white cursor-pointer"
          >
            <option value="">-- Choose Catalogue --</option>
            {majors.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Chapter Node</label>
          <select 
            value={selectedChapterId}
            disabled={!selectedMajorId}
            onChange={handleChapterChange}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
          >
            <option value="">-- Choose Chapter --</option>
            {chapters.map(c => <option key={c.id} value={c.id}>Ch {c.sequence_order}: {c.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Lesson Page</label>
          <select 
            value={selectedLessonId}
            disabled={!selectedChapterId}
            onChange={handleLessonChange}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
          >
            <option value="">-- Choose Lesson --</option>
            {lessons.map(l => <option key={l.id} value={l.id}>Les {l.sequence_order}: {l.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Anchor Slide Unit</label>
          <select 
            value={selectedSlideId}
            disabled={!selectedLessonId}
            onChange={handleSlideChange}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
          >
            <option value="">-- Choose Slide Deck --</option>
            {slides.map((s, idx) => (
              <option key={s.id} value={s.id}>
                Slide #{s.sequence_order || idx + 1} ({s.content.replace(/<[^>]*>?/gm, ' ').substring(0, 15)}...)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Slide-relative Content Area */}
      {selectedSlideId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: exercises connected to slide */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected Slide Drills ({exercises.length})</h3>
              <button
                onClick={initiateNewForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-950/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Drill
              </button>
            </div>

            {loading && exercises.length === 0 ? (
              <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-3xl">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading assessment drills...</span>
              </div>
            ) : exercises.length > 0 ? (
              <div className="space-y-3">
                {exercises.map((ex, index) => (
                  <div 
                    key={ex.id}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${
                      editingExercise?.id === ex.id 
                        ? "bg-slate-900 border-indigo-500 shadow-md shadow-indigo-900/10" 
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                    onClick={() => populateFormForEdit(ex)}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-slate-950/80 rounded-full border border-slate-800/60 text-slate-400 font-mono">
                          Q#{index + 1}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400">
                          {ex.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate leading-snug">
                        {ex.question_data.question}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); populateFormForEdit(ex); }}
                        className="p-1.5 text-slate-500 group-hover:text-indigo-400 bg-slate-950/60 rounded-lg hover:bg-slate-950 transition-colors border border-transparent hover:border-indigo-900/10"
                        title="Edit question details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }}
                        className="p-1.5 text-slate-500 group-hover:text-red-400 bg-slate-950/60 rounded-lg hover:bg-slate-950 transition-colors border border-transparent hover:border-red-900/20"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/30 border-2 border-dashed border-slate-805 rounded-[2rem] p-12 text-center">
                <HelpCircle className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
                <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1">No Assessment Drills</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto font-semibold leading-relaxed">No evaluation exercises are attached to this slide yet. Build a quiz response using the builder panel.</p>
              </div>
            )}
          </div>

          {/* Right panel: dynamic exercise form builder */}
          <div className="lg:col-span-7">
            {isCreatingNew || editingExercise ? (
              <form onSubmit={handleFormSubmit} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                      <FileEdit className="w-5 h-5 text-indigo-500 animate-pulse" />
                      {editingExercise ? 'Edit Quiz Drill' : 'Draft Assessment Drill'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure parameters and click save</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="p-2 hover:bg-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Select Type */}
                  <div className="md:col-span-5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Question Mode *</label>
                    <select
                      value={qType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setQType(val);
                        if (['single_choice', 'multiple_choice'].includes(val) && options.length === 0) {
                          setOptions(['Option A', 'Option B']);
                          setCorrectAnswersList([0]);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="single_choice">Single Choice (Radio)</option>
                      <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                      <option value="short_answer">Short Answer (Exact Match)</option>
                      <option value="paragraph">Paragraph response (Manual)</option>
                    </select>
                  </div>

                  {/* Icon view mode representing selection */}
                  <div className="md:col-span-7 flex items-center gap-3 bg-slate-950 border border-slate-850 p-4 rounded-xl shrink-0">
                    {qType === 'single_choice' && <CircleDot className="w-5 h-5 text-indigo-400 shrink-0" />}
                    {qType === 'multiple_choice' && <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {qType === 'short_answer' && <FileEdit className="w-5 h-5 text-orange-400 shrink-0" />}
                    {qType === 'paragraph' && <AlignLeft className="w-5 h-5 text-indigo-400 shrink-0" />}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Evaluation Rules</p>
                      <p className="text-[9px] text-slate-500 font-bold leading-normal">
                        {qType === 'single_choice' && 'Scores only on selecting exactly ONE target option match.'}
                        {qType === 'multiple_choice' && 'Scores on selecting ALL correct checkmarks indices.'}
                        {qType === 'short_answer' && 'Scores on input matching the designated string parameter.'}
                        {qType === 'paragraph' && 'Provides simple open response area; no automatic grade key.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question Area */}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Question Formulation Text *</label>
                  <textarea 
                    required 
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g., Which index of the GDP does the consumer sentiment index represent?"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white placeholder:text-slate-650 resize-none leading-relaxed"
                  />
                </div>

                {/* DYNAMIC SCENARIOS PREFERENCE BASED ON TYPE */}
                {['single_choice', 'multiple_choice'].includes(qType) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Multiple choice options list ({options.length})</label>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#a5b4fc]"
                      >
                        + Add Choice option
                      </button>
                    </div>

                    <div className="space-y-3">
                      {options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          {/* Correctness Toggle button */}
                          {qType === 'single_choice' ? (
                            <button
                              type="button"
                              onClick={() => toggleSingleChoiceCorrectness(oIdx)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border ${
                                correctAnswersList.includes(oIdx) 
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/30" 
                                  : "border-slate-850 hover:border-slate-700 bg-slate-950 hover:text-indigo-400 max:text-slate-500"
                              }`}
                              title={correctAnswersList.includes(oIdx) ? "Marked as Correct answer" : "Mark as correct"}
                            >
                              {correctAnswersList.includes(oIdx) ? <Check className="w-3.5 h-3.5" /> : null}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleMultipleChoiceCorrectness(oIdx)}
                              className={`w-6 h-6 rounded-[6px] flex items-center justify-center transition-all border ${
                                correctAnswersList.includes(oIdx) 
                                  ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/40" 
                                  : "border-slate-850 hover:border-slate-705 bg-slate-950 hover:text-emerald-400"
                              }`}
                              title={correctAnswersList.includes(oIdx) ? "Marked as Correct option bundle" : "Mark as correct option"}
                            >
                              {correctAnswersList.includes(oIdx) ? <Check className="w-3.5 h-3.5" /> : null}
                            </button>
                          )}

                          <input 
                            type="text" 
                            required 
                            value={opt}
                            onChange={(e) => handleOptionTextChange(oIdx, e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 py-2 px-3 rounded-lg outline-none text-xs font-bold text-white focus:border-slate-700"
                          />

                          {options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(oIdx)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-950 rounded-lg transition-colors"
                              title="Delete option"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === 'short_answer' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Designated Correct Phrase / Word match *</label>
                    <input 
                      type="text" 
                      required 
                      value={shortAnswerMatch}
                      onChange={(e) => setShortAnswerMatch(e.target.value)}
                      placeholder='e.g., Gross Domestic Product (Case-insensitive match)'
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-white placeholder:text-slate-650 font-mono"
                    />
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Students must type the exact word or string matching the value above to score correctness.</p>
                  </div>
                )}

                {qType === 'paragraph' && (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 text-center space-y-2">
                    <AlignLeft className="w-8 h-8 text-slate-700 mx-auto" />
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">Open Essay Parameter Active</h4>
                    <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed font-bold uppercase">No specific string match constraint triggers auto-grading. These items will be stored securely under user submission logs for review.</p>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Commit Assessment Drill
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-900/35 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center shadow-inner">
                <HelpCircle className="w-12 h-12 text-slate-850 mx-auto mb-4" />
                <h3 className="text-sm font-black text-[#a5b4fc] uppercase tracking-wide">Builder Standby</h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-6">Select an existing question from the left sidebar drill list to edit its content, or click "+ Add Drill" to mount a new evaluation matrix.</p>
                <button
                  onClick={initiateNewForm}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-750"
                >
                  Create Quiz Drill
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="col-span-full bg-slate-900/30 border border-slate-800 rounded-[3rem] p-24 text-center max-w-2xl mx-auto w-full">
          <div className="w-20 h-20 bg-slate-950/80 border border-slate-805 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FolderLock className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tighter mb-2">Workspace Standby</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium leading-relaxed mb-8">
            Please pick a specific <strong>Major Catalog</strong>, followed by its nested <strong>Chapter</strong>, <strong>Lesson ID</strong>, and <strong>Slide Node</strong> inside our core database to unlock associated questionnaire components.
          </p>
          <div className="flex justify-center gap-1.5">
            <span className="px-3 py-1 bg-slate-950 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-850">SELECT MAJOR</span>
            <span className="px-3 py-1 bg-slate-950 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-850">ANCHOR SLIDE</span>
            <span className="px-3 py-1 bg-slate-950 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-850">CREATE QUIZ</span>
          </div>
        </div>
      )}
    </div>
  );
}
