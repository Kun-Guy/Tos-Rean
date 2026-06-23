import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  ChevronRight, 
  BookOpen, 
  Folder, 
  Layers, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Upload,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { 
  useAdminData, 
  Major, 
  Course,
  Chapter, 
  Lesson, 
  Slide 
} from '../../hooks/useAdminData';
import AdminSlideEditor from './AdminSlideEditor';
import CreateMajorForm from './CreateMajorForm';
import CreateCourseForm from './CreateCourseForm';
import CreateLessonModal from './CreateLessonModal';

type LadderLevel = 'majors' | 'courses' | 'chapters' | 'lessons' | 'slides';

export default function AdminContentManager() {
  const { 
    loading, 
    error, 
    fetchMajors, 
    createMajor, 
    updateMajor, 
    deleteMajor,
    fetchCourses,
    fetchCoursesByMajor,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchChapters, 
    createChapter, 
    updateChapter, 
    deleteChapter,
    fetchLessons, 
    createLesson, 
    updateLesson, 
    deleteLesson,
    fetchSlides, 
    createSlide, 
    deleteSlide,
    uploadAsset
  } = useAdminData();

  // Content state
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);

  // Selection state
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);

  // Modals
  const [modalType, setModalType] = useState<'major_create' | 'major_edit' | 'course_create' | 'course_edit' | 'chapter_create' | 'chapter_edit' | 'lesson_create' | 'lesson_edit' | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: LadderLevel; id: string; name: string } | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSequence, setFormSequence] = useState(1);
  const [formMajorId, setFormMajorId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  // Initial Fetch - Majors
  const loadMajors = useCallback(async () => {
    const data = await fetchMajors();
    setMajors(data);
  }, [fetchMajors]);

  useEffect(() => {
    loadMajors();
  }, [loadMajors]);

  // Handle drill downs
  const handleSelectMajor = async (major: Major) => {
    setSelectedMajor(major);
    setSelectedCourse(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setActiveSlide(null);
    const data = await fetchCoursesByMajor(major.id);
    setCourses(data);
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setActiveSlide(null);
    const data = await fetchChapters(course.id);
    setChapters(data);
  };

  const handleSelectChapter = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setSelectedLesson(null);
    setActiveSlide(null);
    const data = await fetchLessons(chapter.id);
    setLessons(data);
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveSlide(null);
    const data = await fetchSlides(lesson.id);
    setSlides(data);
  };

  const handleCreateSlide = async () => {
    if (!selectedLesson) return;
    const nextOrder = slides.length > 0 ? Math.max(...slides.map(s => s.sequence_order)) + 1 : 1;
    const initialContent = `<p>Welcome to Lesson: <b>${selectedLesson.title}</b>. Edit this slide content using the builder.</p>`;
    const data = await createSlide(selectedLesson.id, initialContent, nextOrder);
    if (data) {
      setSlides(prev => [...prev, data].sort((a, b) => a.sequence_order - b.sequence_order));
      setActiveSlide(data);
    }
  };

  // Delete Action Dispatcher
  const requestDelete = (type: LadderLevel, id: string, name: string) => {
    setDeleteConfirmation({ type, id, name });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation;

    let success = false;
    if (type === 'majors') {
      success = await deleteMajor(id);
      if (success) {
        setMajors(prev => prev.filter(m => m.id !== id));
        if (selectedMajor?.id === id) {
          setSelectedMajor(null);
          setSelectedCourse(null);
          setSelectedChapter(null);
          setSelectedLesson(null);
          setActiveSlide(null);
        }
      }
    } else if (type === 'courses') {
      success = await deleteCourse(id);
      if (success) {
        setCourses(prev => prev.filter(c => c.id !== id));
        if (selectedCourse?.id === id) {
          setSelectedCourse(null);
          setSelectedChapter(null);
          setSelectedLesson(null);
          setActiveSlide(null);
        }
      }
    } else if (type === 'chapters') {
      success = await deleteChapter(id);
      if (success) {
        setChapters(prev => prev.filter(c => c.id !== id));
        if (selectedChapter?.id === id) {
          setSelectedChapter(null);
          setSelectedLesson(null);
          setActiveSlide(null);
        }
      }
    } else if (type === 'lessons') {
      success = await deleteLesson(id);
      if (success) {
        setLessons(prev => prev.filter(l => l.id !== id));
        if (selectedLesson?.id === id) {
          setSelectedLesson(null);
          setActiveSlide(null);
        }
      }
    } else if (type === 'slides') {
      success = await deleteSlide(id);
      if (success) {
        setSlides(prev => prev.filter(s => s.id !== id));
        if (activeSlide?.id === id) {
          setActiveSlide(null);
        }
      }
    }

    if (success) {
      setDeleteConfirmation(null);
    }
  };

  // Image upload handler for covers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(true);
    const publicUrl = await uploadAsset(file, 'note_images');
    if (publicUrl) {
      setFormImageUrl(publicUrl);
    }
    setUploadProgress(false);
  };

  // Submit forms
  const openFormModal = (type: typeof modalType, target: any = null) => {
    setModalType(type);
    setEditTarget(target);
    if (type?.endsWith('edit') && target) {
      setFormTitle(target.title || '');
      setFormDescription(target.description || '');
      setFormImageUrl(target.cover_image_url || '');
      setFormSequence(target.sequence_order || 1);
      setFormMajorId(target.major_id || selectedMajor?.id || '');
    } else {
      setFormTitle('');
      setFormDescription('');
      setFormImageUrl('');
      setFormMajorId(selectedMajor?.id || '');
      // Auto sequence for Chapters and Lessons
      if (type === 'chapter_create') {
        setFormSequence(chapters.length > 0 ? Math.max(...chapters.map(c => c.sequence_order)) + 1 : 1);
      } else if (type === 'lesson_create') {
        setFormSequence(lessons.length > 0 ? Math.max(...lessons.map(l => l.sequence_order)) + 1 : 1);
      } else {
        setFormSequence(1);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (modalType === 'major_create') {
      const data = await createMajor(formTitle, formDescription, formImageUrl);
      if (data) setMajors(prev => [data, ...prev]);
    } else if (modalType === 'major_edit' && editTarget) {
      const data = await updateMajor(editTarget.id, formTitle, formDescription, formImageUrl);
      if (data) {
        setMajors(prev => prev.map(m => m.id === editTarget.id ? data : m));
        if (selectedMajor?.id === editTarget.id) setSelectedMajor(data);
      }
    } else if (modalType === 'course_create') {
      const parentMajorId = formMajorId || selectedMajor?.id;
      if (!parentMajorId) {
        alert("Please select or confirm which Major this Course belongs to.");
        return;
      }
      const data = await createCourse(parentMajorId, formTitle, formDescription, formImageUrl);
      if (data) {
        setCourses(prev => [data, ...prev]);
      }
    } else if (modalType === 'course_edit' && editTarget) {
      const parentMajorId = formMajorId || selectedMajor?.id || editTarget.major_id;
      const data = await updateCourse(editTarget.id, parentMajorId, formTitle, formDescription, formImageUrl);
      if (data) {
        setCourses(prev => prev.map(c => c.id === editTarget.id ? data : c));
        if (selectedCourse?.id === editTarget.id) setSelectedCourse(data);
      }
    } else if (modalType === 'chapter_create' && selectedCourse) {
      const data = await createChapter(selectedCourse.id, formTitle, formSequence);
      if (data) setChapters(prev => [...prev, data].sort((a, b) => a.sequence_order - b.sequence_order));
    } else if (modalType === 'chapter_edit' && editTarget) {
      const data = await updateChapter(editTarget.id, formTitle, formSequence);
      if (data) {
        setChapters(prev => prev.map(c => c.id === editTarget.id ? data : c).sort((a, b) => a.sequence_order - b.sequence_order));
        if (selectedChapter?.id === editTarget.id) setSelectedChapter(data);
      }
    } else if (modalType === 'lesson_create' && selectedChapter) {
      const data = await createLesson(selectedChapter.id, formTitle, formSequence);
      if (data) setLessons(prev => [...prev, data].sort((a, b) => a.sequence_order - b.sequence_order));
    } else if (modalType === 'lesson_edit' && editTarget) {
      const data = await updateLesson(editTarget.id, formTitle, formSequence);
      if (data) {
        setLessons(prev => prev.map(l => l.id === editTarget.id ? data : l).sort((a, b) => a.sequence_order - b.sequence_order));
        if (selectedLesson?.id === editTarget.id) setSelectedLesson(data);
      }
    }

    setModalType(null);
    setEditTarget(null);
  };

  // Breadcrumbs Generator
  const renderBreadcrumbs = () => {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 mb-6">
        <button 
          onClick={() => {
            setSelectedMajor(null);
            setSelectedCourse(null);
            setSelectedChapter(null);
            setSelectedLesson(null);
            setActiveSlide(null);
          }}
          className={selectedMajor ? "hover:text-white" : "text-indigo-400 font-extrabold"}
        >
          Majors
        </button>
        {selectedMajor && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <button 
              onClick={() => {
                setSelectedCourse(null);
                setSelectedChapter(null);
                setSelectedLesson(null);
                setActiveSlide(null);
              }}
              className={selectedCourse ? "hover:text-white text-slate-400" : "text-indigo-400 font-extrabold"}
            >
              {selectedMajor.title}
            </button>
          </>
        )}
        {selectedCourse && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <button 
              onClick={() => {
                setSelectedChapter(null);
                setSelectedLesson(null);
                setActiveSlide(null);
              }}
              className={selectedChapter ? "hover:text-white text-slate-400" : "text-indigo-400 font-extrabold"}
            >
              {selectedCourse.title}
            </button>
          </>
        )}
        {selectedChapter && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <button 
              onClick={() => {
                setSelectedLesson(null);
                setActiveSlide(null);
              }}
              className={selectedLesson ? "hover:text-white text-slate-400" : "text-indigo-400 font-extrabold"}
            >
              {selectedChapter.title}
            </button>
          </>
        )}
        {selectedLesson && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-indigo-400 font-extrabold truncate">
              {selectedLesson.title}
            </span>
          </>
        )}
      </div>
    );
  };

  // If slide editor is active, display the SlideEditor screen and suppress current content ladder list
  if (activeSlide) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Management Ladder</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{selectedMajor?.title}</span>
          {selectedCourse && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{selectedCourse.title}</span>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{selectedChapter?.title}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-300 truncate">{selectedLesson?.title}</span>
        </div>
        
        <AdminSlideEditor 
          slide={activeSlide} 
          onBack={() => setActiveSlide(null)}
          onSave={(updated) => {
            setSlides(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a,b) => a.sequence_order - b.sequence_order));
            setActiveSlide(updated);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
            Learning Content <span className="text-indigo-500">Ladder</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Build majors, courses, chapters, lessons and slides dynamically
          </p>
        </div>

        {!selectedMajor && (
          <button 
            onClick={() => openFormModal('major_create')}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Major Catalog
          </button>
        )}
        {selectedMajor && !selectedCourse && (
          <button 
            onClick={() => openFormModal('course_create')}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Course
          </button>
        )}
        {selectedCourse && !selectedChapter && (
          <button 
            onClick={() => openFormModal('chapter_create')}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Chapter to Course
          </button>
        )}
        {selectedChapter && !selectedLesson && (
          <button 
            onClick={() => openFormModal('lesson_create')}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Lesson Entry
          </button>
        )}
        {selectedLesson && (
          <button 
            onClick={handleCreateSlide}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Slide Page
          </button>
        )}
      </section>

      {/* Navigation Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Loading & Errors */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-20 gap-4 bg-slate-900/30 border border-slate-900 rounded-[2.5rem]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#a5b4fc]">Accessing Core Data Elements...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border-2 border-red-900/50 rounded-[2rem] p-6 text-red-400 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>Error processing content changes: {error}</span>
        </div>
      )}

      {/* 1. MAJORS VIEW CONTAINER */}
      {!selectedMajor && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {majors.length > 0 ? (
            majors.map((m) => (
              <div 
                key={m.id} 
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-indigo-950/25 hover:border-slate-700 transition-all cursor-pointer flex flex-col group relative overflow-hidden"
                onClick={() => handleSelectMajor(m)}
              >
                {m.cover_image_url && (
                  <div className="h-40 w-full mb-6 rounded-2xl overflow-hidden relative border border-slate-800">
                    <img src={m.cover_image_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                  </div>
                )}
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openFormModal('major_edit', m)}
                        className="p-2 bg-slate-805 hover:bg-slate-700 hover:text-white rounded-lg text-slate-400 transition-colors"
                        title="Edit catalog details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => requestDelete('majors', m.id, m.title)}
                        className="p-2 bg-slate-805 hover:bg-red-950 hover:text-red-400 rounded-lg text-slate-400 transition-colors border border-transparent hover:border-red-900/30"
                        title="Delete Major"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors leading-snug">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 line-clamp-3">
                      {m.description || 'No database description configured.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#a5b4fc]">
                  <span>Explore courses</span>
                  <ChevronRight className="w-4 h-4 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center max-w-lg mx-auto w-full">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white tracking-tight mb-1">Catalog empty</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Create a major learning syllabus catalog to host structured learning pathways.</p>
              <button 
                onClick={() => openFormModal('major_create')}
                className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Create Major Catalogue
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1.5. COURSES VIEW CONTAINER */}
      {selectedMajor && !selectedCourse && !loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedMajor.cover_image_url && (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                  <img src={selectedMajor.cover_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Major Pathway</span>
                <h2 className="text-xl font-black text-slate-100 tracking-tight">{selectedMajor.title}</h2>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMajor(null)}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-800"
            >
              Back to Majors
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Courses inside Major</h3>
            <button 
              onClick={() => openFormModal('course_create')}
              className="text-[10px] bg-indigo-650 hover:bg-indigo-600 text-white py-2 px-4 rounded-xl flex items-center gap-1 font-black uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Course
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length > 0 ? (
              courses.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-indigo-950/25 hover:border-slate-700 transition-all cursor-pointer flex flex-col group relative overflow-hidden"
                  onClick={() => handleSelectCourse(c)}
                >
                  {c.cover_image_url && (
                    <div className="h-40 w-full mb-6 rounded-2xl overflow-hidden relative border border-slate-800">
                      <img src={c.cover_image_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-10 h-10 bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => openFormModal('course_edit', c)}
                          className="p-2 bg-slate-805 hover:bg-slate-700 hover:text-white rounded-lg text-slate-400 transition-colors"
                          title="Edit course details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => requestDelete('courses', c.id, c.title)}
                          className="p-2 bg-slate-805 hover:bg-red-950 hover:text-red-400 rounded-lg text-slate-400 transition-colors border border-transparent hover:border-red-900/30"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors leading-snug">
                        {c.title}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 line-clamp-3">
                        {c.description || 'No database description configured.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#a5b4fc]">
                    <span>Drill down chapters</span>
                    <ChevronRight className="w-4 h-4 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center max-w-lg mx-auto w-full">
                <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-black text-white tracking-tight mb-1">No Courses Created</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Create courses under this major pathway to contain curriculum chapters.</p>
                <button 
                  onClick={() => openFormModal('course_create')}
                  className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Create Initial Course
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CHAPTERS VIEW CONTAINER */}
      {selectedMajor && selectedCourse && !selectedChapter && !loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedCourse.cover_image_url && (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                  <img src={selectedCourse.cover_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Course Directory</span>
                <h2 className="text-xl font-black text-slate-100 tracking-tight">{selectedCourse.title}</h2>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Parent Major: {selectedMajor.title}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedCourse(null)}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-800"
            >
              Change Course
            </button>
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Chapters inside Course</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.length > 0 ? (
              chapters.map((c) => (
                <div 
                  key={c.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
                  onClick={() => handleSelectChapter(c)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 text-indigo-400 text-xs font-black font-mono flex items-center justify-center shrink-0">
                      {c.sequence_order}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                        {c.title}
                      </h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Order Index: #{c.sequence_order}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => openFormModal('chapter_edit', c)}
                      className="p-2 bg-slate-850 hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => requestDelete('chapters', c.id, c.title)}
                      className="p-2 bg-slate-850 hover:bg-red-950 hover:text-red-400 rounded-lg text-slate-400 transition-colors border border-transparent hover:border-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem] p-16 text-center max-w-sm mx-auto w-full">
                <Folder className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                <h4 className="text-sm font-black text-white tracking-tight mb-1">No Chapters Created</h4>
                <p className="text-[11px] text-slate-500 mb-6">Create structural chapters inside this course to segment core topics.</p>
                <button 
                  onClick={() => openFormModal('chapter_create')}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Create Chapter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. LESSONS VIEW CONTAINER */}
      {selectedMajor && selectedCourse && selectedChapter && !selectedLesson && !loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">CHAPTER NODE LEVEL</span>
              <h2 className="text-lg font-black text-white tracking-tight">{selectedChapter.title}</h2>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Parent Course: {selectedCourse.title} ({selectedMajor.title})</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedChapter(null)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-800"
              >
                Change Chapter
              </button>
            </div>
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Lessons Inside Chapter</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons.length > 0 ? (
              lessons.map((l) => (
                <div 
                  key={l.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
                  onClick={() => handleSelectLesson(l)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 text-indigo-400 text-xs font-black font-mono flex items-center justify-center shrink-0">
                      {l.sequence_order}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                        {l.title}
                      </h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Sequence Index: #{l.sequence_order}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => openFormModal('lesson_edit', l)}
                      className="p-2 bg-slate-850 hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => requestDelete('lessons', l.id, l.title)}
                      className="p-2 bg-slate-850 hover:bg-red-950 hover:text-red-400 rounded-lg text-slate-400 transition-colors border border-transparent hover:border-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem] p-16 text-center max-w-sm mx-auto w-full">
                <Layers className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                <h4 className="text-sm font-black text-white tracking-tight mb-1">No Lessons Created</h4>
                <p className="text-[11px] text-slate-500 mb-6">Lessons contain slides and interactive evaluation drills.</p>
                <button 
                  onClick={() => openFormModal('lesson_create')}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Create Lesson Catalog
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SLIDES VIEW CONTAINER */}
      {selectedMajor && selectedCourse && selectedChapter && selectedLesson && !loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">LESSON MATRICES LEVEL</span>
              <h2 className="text-lg font-black text-white tracking-tight">{selectedLesson.title}</h2>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Lesson: {selectedLesson.title} • Chapter: {selectedChapter.title} • Course: {selectedCourse.title}</p>
            </div>
            <button 
              onClick={() => setSelectedLesson(null)}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-800"
            >
              Change Lesson
            </button>
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Slide Decks in Lesson</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slides.length > 0 ? (
              slides.map((s, index) => (
                <div 
                  key={s.id}
                  className="bg-slate-900 border border-slate-805 rounded-3xl p-6 hover:shadow-xl hover:border-slate-700 transition-all flex flex-col h-56 justify-between cursor-pointer group"
                  onClick={() => setActiveSlide(s)}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-lg bg-orange-950/40 border border-orange-900/30 text-orange-400 font-mono text-xs font-black flex items-center justify-center">
                      #{s.sequence_order || index + 1}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete('slides', s.id, `Slide #${s.sequence_order}`);
                      }}
                      className="p-2 hover:bg-red-950 hover:text-red-400 text-slate-500 rounded-lg transition-colors border border-transparent hover:border-red-900/20"
                      title="Remove slide page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-white tracking-widest uppercase mb-1 flex items-center gap-1.5 group-hover:text-indigo-400 transition-all">
                      <FileText className="w-3.5 h-3.5" />
                      Slide Page
                    </h4>
                    {/* Content snippet strip HTML */}
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed" 
                       dangerouslySetInnerHTML={{ __html: s.content.replace(/<[^>]*>?/gm, ' ').substring(0, 80) }} />
                  </div>

                  <div className="pt-4 border-t border-slate-800/85 text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Manage Content</span>
                    <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem] p-16 text-center max-w-sm mx-auto w-full">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                <h4 className="text-sm font-black text-white tracking-tight mb-1">Slide deck empty</h4>
                <p className="text-[11px] text-slate-500 mb-6">Build out learning slides using direct text, structural lists, or embedded illustrations.</p>
                <button 
                  onClick={handleCreateSlide}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Create Initial Slide
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FORM MODAL DIALOG --- */}
      {modalType && (
        modalType.startsWith('major') ? (
          <CreateMajorForm
            onClose={() => {
              setModalType(null);
              setEditTarget(null);
            }}
            uploadAsset={uploadAsset}
            initialData={
              modalType === 'major_edit' && editTarget
                ? {
                    id: editTarget.id,
                    title: editTarget.title,
                    description: editTarget.description || '',
                    cover_image_url: editTarget.cover_image_url || '',
                  }
                : null
            }
            onSave={async (title, description, imageUrl) => {
              if (modalType === 'major_create') {
                const data = await createMajor(title, description, imageUrl);
                if (data) setMajors(prev => [data, ...prev]);
              } else if (modalType === 'major_edit' && editTarget) {
                const data = await updateMajor(editTarget.id, title, description, imageUrl);
                if (data) {
                  setMajors(prev => prev.map(m => m.id === editTarget.id ? data : m));
                  if (selectedMajor?.id === editTarget.id) setSelectedMajor(data);
                }
              }
            }}
          />
        ) : modalType.startsWith('course') ? (
          <CreateCourseForm
            onClose={() => {
              setModalType(null);
              setEditTarget(null);
            }}
            uploadAsset={uploadAsset}
            majors={majors}
            defaultMajorId={selectedMajor?.id || ''}
            initialData={
              modalType === 'course_edit' && editTarget
                ? {
                    id: editTarget.id,
                    title: editTarget.title,
                    major_id: editTarget.major_id,
                    description: editTarget.description || '',
                    cover_image_url: editTarget.cover_image_url || '',
                  }
                : null
            }
            onSave={async (title, majorId, description, imageUrl) => {
              if (modalType === 'course_create') {
                const data = await createCourse(majorId, title, description, imageUrl);
                if (data) {
                  setCourses(prev => [data, ...prev]);
                }
              } else if (modalType === 'course_edit' && editTarget) {
                const data = await updateCourse(editTarget.id, majorId, title, description, imageUrl);
                if (data) {
                  setCourses(prev => prev.map(c => c.id === editTarget.id ? data : c));
                  if (selectedCourse?.id === editTarget.id) setSelectedCourse(data);
                }
              }
            }}
          />
        ) : modalType.startsWith('lesson') ? (
          <CreateLessonModal
            onClose={() => {
              setModalType(null);
              setEditTarget(null);
            }}
            uploadAsset={uploadAsset}
            selectedChapterId={selectedChapter?.id || ''}
            initialData={
              modalType === 'lesson_edit' && editTarget
                ? {
                    id: editTarget.id,
                    title: editTarget.title,
                    sequence_order: editTarget.sequence_order,
                    video_url: editTarget.video_url,
                  }
                : null
            }
            onSave={async (title, sequenceOrder, videoUrl) => {
              if (selectedChapter) {
                const data = await fetchLessons(selectedChapter.id);
                setLessons(data);
                if (modalType === 'lesson_edit' && editTarget) {
                  const updatedLesson = data.find(l => l.id === editTarget.id);
                  if (updatedLesson && selectedLesson?.id === editTarget.id) setSelectedLesson(updatedLesson);
                }
              }
            }}
          />
        ) : (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
              <h2 className="text-xl font-black text-white tracking-tight mb-1">
                {modalType.endsWith('create') ? 'Create New Entry' : 'Update Attributes'}
              </h2>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-6">
                {modalType.split('_')[0].toUpperCase()} PROPERTIES SPECIFICATION
              </p>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Identifier Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Intro to Advanced Macroeconomics"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650"
                  />
                </div>

                {/* Major dropdown for Course creation */}
                {modalType.startsWith('course') && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Belongs to Major *</label>
                    <select
                      required
                      value={formMajorId}
                      onChange={(e) => setFormMajorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white"
                    >
                      <option value="">-- Select Major Pathway --</option>
                      {majors.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descriptions & Cover banners apply at MAJOR & COURSE levels */}
                {(modalType.startsWith('major') || modalType.startsWith('course')) && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Narrative Description</label>
                      <textarea 
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="High-level syllabus outline for enrollment students..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650 resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cover Header Image</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-example"
                          className="flex-1 bg-slate-950 border border-slate-800 py-3 px-4 rounded-xl outline-none text-xs font-bold text-white placeholder:text-slate-650"
                        />
                        <label className="p-3 bg-slate-800 border border-slate-750 hover:bg-slate-755 rounded-xl cursor-pointer text-slate-300">
                          {uploadProgress ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Upload className="w-4 h-4" />}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadProgress} />
                        </label>
                      </div>
                      {formImageUrl && (
                        <div className="mt-2.5 h-16 rounded-lg overflow-hidden border border-slate-850">
                          <img src={formImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Order sequences apply to Chapters and Lessons */}
                {(modalType.startsWith('chapter') || modalType.startsWith('lesson')) && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sequence order *</label>
                    <input 
                      type="number" 
                      required 
                      value={formSequence}
                      onChange={(e) => setFormSequence(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold font-mono transition-all text-white"
                    />
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Positions this node layout in relation to other siblings.</p>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    type="button"
                    onClick={() => { setModalType(null); setEditTarget(null); }}
                    className="px-5 py-3.5 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    disabled={uploadProgress}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Save Entity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/30 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Are you fully sure?</h3>
            <div className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider mb-6">
              <span>You are deleting a <b>{deleteConfirmation.type.toUpperCase().slice(0, -1)}</b>:</span>
              <p className="text-white font-extrabold mt-1 text-sm">"{deleteConfirmation.name}"</p>
              <span className="text-rose-500 mt-2 block font-black text-[9px]">⚠️ All child records and references (lessons, exercises, completions) will be permanently cascade-deleted!</span>
            </div>

            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="px-5 py-3 text-slate-400 hover:text-white text-[10px] font-black bg-slate-850 hover:bg-slate-850 rounded-xl uppercase tracking-widest transition-colors"
              >
                Back out
              </button>
              <button 
                onClick={executeDelete}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
