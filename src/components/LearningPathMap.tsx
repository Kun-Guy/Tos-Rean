import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, Lock, Award, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface Lesson {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
  duration: string;
  sequence_order: number;
}

interface Chapter {
  id: string;
  title: string;
  sequence_order: number;
  lessons: Lesson[];
  cover_image_url?: string;
}

interface LearningPathMapProps {
  chapters: Chapter[];
}

const GRADIENTS = [
  { 
    from: 'from-indigo-50/90', 
    to: 'to-blue-50/40', 
    border: 'border-indigo-100', 
    text: 'text-indigo-900', 
    badgeBg: 'bg-indigo-100/80', 
    badgeText: 'text-indigo-700',
    progressColor: 'bg-indigo-600'
  },
  { 
    from: 'from-violet-50/90', 
    to: 'to-purple-50/40', 
    border: 'border-violet-100', 
    text: 'text-violet-900', 
    badgeBg: 'bg-violet-100/80', 
    badgeText: 'text-violet-700',
    progressColor: 'bg-violet-600'
  },
  { 
    from: 'from-emerald-50/90', 
    to: 'to-teal-50/40', 
    border: 'border-emerald-100', 
    text: 'text-emerald-950', 
    badgeBg: 'bg-emerald-100/80', 
    badgeText: 'text-emerald-700',
    progressColor: 'bg-emerald-600'
  },
  { 
    from: 'from-amber-50/90', 
    to: 'to-orange-50/40', 
    border: 'border-amber-100', 
    text: 'text-amber-900', 
    badgeBg: 'bg-amber-100/80', 
    badgeText: 'text-amber-700',
    progressColor: 'bg-amber-600'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 14 } }
};

export default function LearningPathMap({ chapters }: LearningPathMapProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 pb-16">
      {chapters.map((chapter, chapIdx) => {
        const totalCount = chapter.lessons?.length || 0;
        const completedCount = chapter.lessons?.filter(l => l.status === 'completed').length || 0;
        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        const gradient = GRADIENTS[chapIdx % GRADIENTS.length];

        return (
          <div 
            key={chapter.id} 
            className="bg-white/80 backdrop-blur-sm rounded-[2rem] border border-slate-105/70 p-4 md:p-6 shadow-sm overflow-hidden"
          >
            {/* Chapter Header Card with Soft Background Gradient */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl border p-5 md:p-6 bg-gradient-to-r shadow-xs",
              gradient.from,
              gradient.to,
              gradient.border
            )}>
              {/* Optional Cover Image Background */}
              {chapter.cover_image_url && (
                <div 
                  className="absolute inset-0 opacity-12 bg-cover bg-center mix-blend-overlay pointer-events-none" 
                  style={{ backgroundImage: `url(${chapter.cover_image_url})` }} 
                />
              )}

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    gradient.badgeBg,
                    gradient.badgeText
                  )}>
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    UNIT {chapIdx + 1}
                  </div>
                  <h3 className={cn("text-lg md:text-xl font-black tracking-tight leading-snug", gradient.text)}>
                    {chapter.title}
                  </h3>
                </div>

                <div className="bg-white/70 backdrop-blur-xs rounded-xl p-3 border border-slate-200/40 min-w-[160px] flex flex-col justify-center shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Module Status
                    </span>
                    <span className="text-[10px] font-bold text-slate-650">
                      {percent}% Done
                    </span>
                  </div>
                  <div className="text-xs font-black text-slate-800 flex items-center gap-1 mb-1.5">
                    <span>{completedCount}/{totalCount} Skill Gates</span>
                    {completedCount === totalCount && totalCount > 0 && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                  </div>

                  {/* High Quality Progress Bar */}
                  <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", gradient.progressColor)} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Micro-timelines Container */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="relative max-w-2xl mx-auto px-2 py-4 flex flex-col gap-6"
            >
              {/* Connected Line running vertically */}
              {/* Desktop perfectly centered, Mobile placed beautifully at 34px */}
              <div className="absolute left-[34px] md:left-1/2 -translate-x-1/2 top-4 bottom-4 w-1 bg-slate-200/80 rounded-full" />

              {totalCount === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest py-3">Syllabus nodes are loading...</p>
                </div>
              ) : (
                chapter.lessons.map((lesson, idx) => {
                  const isCompleted = lesson.status === 'completed';
                  const isCurrent = lesson.status === 'current';
                  const isLocked = lesson.status === 'locked';

                  return (
                    <motion.div 
                      key={lesson.id}
                      variants={itemVariants}
                      className="relative flex items-center w-full min-h-[85px]"
                    >
                      {/* Floating Indicator for active lesson */}
                      {isCurrent && (
                        <div className={cn(
                          "absolute -top-4 z-20 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-md animate-bounce select-none whitespace-nowrap border border-blue-400/20",
                          "left-[34px] -translate-x-1/2 md:left-1/2 md:-translate-x-1/2"
                        )}>
                          ACTIVE HERE
                        </div>
                      )}

                      {/* Lesson Circular Button Node centered perfectly on Connecting Line */}
                      <div className="absolute left-[6px] md:left-1/2 -translate-x-0 md:-translate-x-1/2 z-10">
                        <motion.button
                          whileHover={!isLocked ? { scale: 1.1 } : {}}
                          whileTap={!isLocked ? { scale: 0.95 } : {}}
                          onClick={() => {
                            if (!isLocked) {
                              navigate(`/lesson/${lesson.id}`);
                            }
                          }}
                          disabled={isLocked}
                          className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center border-[5px] relative shadow-md transition-all",
                            isCompleted
                              ? "bg-white border-emerald-500 text-emerald-500 hover:border-emerald-600 hover:text-emerald-600 shadow-emerald-100"
                              : isCurrent
                              ? "bg-white border-blue-600 text-blue-600 shadow-lg shadow-blue-100 ring-4 ring-blue-50"
                              : "bg-white border-slate-200 text-slate-305 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            {isCompleted ? (
                              <Check className="w-5 h-5 stroke-[4.5]" />
                            ) : isCurrent ? (
                              <Play className="w-5 h-5 fill-blue-600 text-blue-600 ml-0.5" />
                            ) : (
                              <Lock className="w-4 h-4 text-slate-350" />
                            )}
                          </div>

                          {/* Index badge as decorative support */}
                          <span className={cn(
                            "absolute -bottom-1 -right-1 border-2 border-white text-white text-[8px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-xs",
                            isCompleted
                              ? "bg-emerald-550"
                              : isCurrent
                              ? "bg-blue-600"
                              : "bg-slate-400"
                          )}>
                            {idx + 1}
                          </span>
                        </motion.button>
                      </div>

                      {/* Dynamic Content Columns: Desktop alternates, Mobile remains on right side */}
                      <div className={cn(
                        "w-full pl-20 pr-4 md:pl-0 md:pr-0 md:w-[calc(50%-2.5rem)] flex flex-col justify-center",
                        idx % 2 === 0 
                          ? "md:ml-0 md:mr-auto md:text-right md:pr-8" 
                          : "md:ml-auto md:mr-0 md:text-left md:pl-8"
                      )}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                          GATE {idx + 1}
                        </span>
                        
                        <h4 className={cn(
                          "text-sm font-black tracking-tight leading-snug line-clamp-2",
                          isLocked ? "text-slate-400" : "text-slate-800"
                        )}>
                          {lesson.title}
                        </h4>

                        <div className={cn(
                          "flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500",
                          idx % 2 === 0 ? "md:justify-end" : "md:justify-start"
                        )}>
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{lesson.duration || '15 Mins'}</span>
                          
                          {isCompleted && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-600 font-extrabold uppercase text-[9px] tracking-wider">Completed</span>
                            </>
                          )}
                          
                          {isCurrent && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-blue-600 font-extrabold uppercase text-[9px] tracking-wider animate-pulse">Start Lesson</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
