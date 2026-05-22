import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  ArrowLeft,
  FileText,
  Library,
  StickyNote,
  Clock,
  User as UserIcon,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('syllabus');

  // Dummy syllabus data
  const syllabus = [
    {
      title: "Unit 01: Relational Databases",
      lessons: [
        { title: "Introduction to SQL", status: "completed", duration: "12m" },
        { title: "Normalisation Techniques", status: "current", duration: "25m" },
        { title: "Joins and Subqueries", status: "locked", duration: "18m" },
      ]
    },
    {
      title: "Unit 02: Advanced Data Structures",
      lessons: [
        { title: "B-Trees and Indexing", status: "locked", duration: "30m" },
        { title: "Hash Tables in DBs", status: "locked", duration: "20m" },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header / Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Hero Header */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
              Digital Economy Major
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              <UserIcon className="w-3 h-3" />
              Dr. Chamroeun Sok
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-6 leading-tight max-w-2xl">
            Data Management & Information Systems
          </h1>

          <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <span>Course Completion</span>
                <span className="text-blue-600">12%</span>
              </div>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div className="h-full bg-blue-600 w-[12%] rounded-full shadow-sm shadow-blue-200"></div>
              </div>
            </div>
            
            <div className="flex gap-4">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chapters</span>
                 <span className="text-lg font-black text-slate-900">08 Units</span>
               </div>
               <div className="w-px h-8 bg-slate-100 self-center"></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Students</span>
                 <span className="text-lg font-black text-slate-900">1.2k Enrolled</span>
               </div>
            </div>
          </div>

          <button className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-3">
            <Play className="w-5 h-5 fill-white" />
            Continue Last Lesson
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <BarChart3 className="absolute bottom-10 right-10 w-32 h-32 text-slate-50 opacity-50" />
      </section>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-100 px-4">
        {[
          { id: 'syllabus', label: 'Syllabus', icon: Library },
          { id: 'notes', label: 'My Notes', icon: StickyNote },
          { id: 'resources', label: 'Resources', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all relative",
              activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'syllabus' && (
          <div className="space-y-6">
            {syllabus.map((unit, unitIdx) => (
              <div key={unitIdx} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-900 tracking-tight">{unit.title}</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full">
                    {unit.lessons.length} Lessons
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {unit.lessons.map((lesson, lessonIdx) => (
                    <div 
                      key={lessonIdx}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                        lesson.status === 'current' 
                          ? "bg-blue-50/30 border-blue-100" 
                          : "bg-white border-transparent hover:border-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          lesson.status === 'completed' ? "bg-green-50 text-green-600" :
                          lesson.status === 'current' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" :
                          "bg-slate-50 text-slate-300"
                        )}>
                          {lesson.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                           lesson.status === 'current' ? <Play className="w-5 h-5 fill-white" /> :
                           <Lock className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className={cn(
                            "text-sm font-bold tracking-tight",
                            lesson.status === 'locked' ? "text-slate-300" : "text-slate-900"
                          )}>
                            {lesson.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                               <Clock className="w-3 h-3" />
                               {lesson.duration}
                             </span>
                          </div>
                        </div>
                      </div>

                      {lesson.status !== 'locked' && (
                        <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100">
                           <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col items-center justify-center p-20 bg-amber-50/30 border-2 border-dashed border-amber-100 rounded-[2.5rem] text-center">
             <StickyNote className="w-16 h-16 text-amber-200 mb-4" />
             <p className="text-sm font-bold text-amber-700 uppercase tracking-widest">No Lecture Notes Yet</p>
             <p className="text-xs text-amber-600/70 mt-2 max-w-xs mx-auto">Start viewing slides to capture key insights and build your repository.</p>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Lecture Slides PDF', size: '2.4 MB', type: 'document' },
              { title: 'Case Study: Data Governance', size: '1.1 MB', type: 'document' },
              { title: 'Unit 01 Exam Prep', size: '0.5 MB', type: 'document' },
            ].map((res, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 tracking-tight">{res.title}</h5>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.size}</span>
                  </div>
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Download</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
