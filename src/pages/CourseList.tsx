import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  BookOpen, 
  ChevronRight, 
  Layers,
  GraduationCap as GraduationCapIcon,
  Library,
  Star,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function CourseList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const courses = [
    { id: 'econ-101', title: 'Microeconomics & Macroeconomics', units: 12, major: 'Digital Economy', enrolled: '1.4k', rating: 4.8, color: 'bg-blue-500', icon: BookOpen },
    { id: 'fin-102', title: 'Fundamentals of Finance & Financial Risk', units: 10, major: 'Digital Economy', enrolled: '850', rating: 4.7, color: 'bg-indigo-500', icon: Layers },
    { id: 'data-103', title: 'Data Management & Information Systems', units: 8, major: 'Digital Economy', enrolled: '1.2k', rating: 4.9, color: 'bg-rose-500', icon: BookOpen },
    { id: 'res-104', title: 'Research Methodology', units: 14, major: 'Digital Economy', enrolled: '600', rating: 4.5, color: 'bg-emerald-500', icon: Library },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
             <GraduationCapIcon className="w-4 h-4" />
             University Level Curriculum
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
            Digital Economy <span className="text-blue-600">Library</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Filter courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-white outline-none text-xs font-bold transition-all shadow-sm"
            />
          </div>
          <button className="p-3.5 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm">
             <Filter className="w-4 h-4" />
             Sort
          </button>
        </div>
      </section>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer relative flex flex-col"
            onClick={() => navigate(`/course/${course.id}`)}
          >
            {/* Hover Accent */}
            <div className={cn("absolute top-0 right-10 w-20 h-1 bg-transparent group-hover:block transition-all", course.color)} />

            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-10 text-white shadow-xl transition-transform group-hover:scale-110",
              course.color
            )}>
               <course.icon className="w-7 h-7" />
            </div>

            <div className="flex-1">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 block">{course.major}</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[11px] font-black">{course.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Users className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{course.enrolled}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest leading-none">
                 <span>View Details</span>
                 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
               <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
                 {course.units} Units
               </span>
               <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
                 Full Curriculum
               </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Featured Insight Card */}
      <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl shadow-slate-300">
        <div className="relative z-10 space-y-6 max-w-xl text-center md:text-left">
           <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-4 inline-block">Curriculum Update</span>
           <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
             New Research Methodologies <br/><span className="text-blue-500">& Open Access Resources</span>
           </h2>
           <p className="text-slate-400 font-medium text-lg leading-relaxed">
             We've added 12 new interactive modules for digital economy students. Explore the updated syllabus for the spring semester.
           </p>
           <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-500/20">
             Enroll New Units
           </button>
        </div>

        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-[80px] opacity-20 animate-pulse" />
          <Library className="w-48 h-48 text-blue-500 opacity-80" />
        </div>
      </section>
    </div>
  );
}
