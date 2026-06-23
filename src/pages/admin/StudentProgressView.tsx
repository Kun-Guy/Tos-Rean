import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Loader2, 
  AlertCircle,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { useAdminData, StudentProgress } from '../../hooks/useAdminData';

type SortKey = 'full_name' | 'email' | 'completion_percentage' | 'last_active';
type SortDirection = 'asc' | 'desc';

export default function StudentProgressView() {
  const { loading, error, fetchStudentProgress } = useAdminData();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('last_active');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const loadData = useCallback(async () => {
    const data = await fetchStudentProgress();
    setStudents(data);
  }, [fetchStudentProgress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Sort Toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); // Default to descending for new keys
    }
  };

  // KPI Calculations
  const statsSummary = useMemo(() => {
    const totalStudents = students.length;
    const enrolledStudents = students.filter(s => s.enrolled_courses_ids.length > 0).length;
    const avgCompletion = totalStudents > 0 
      ? Math.floor(students.reduce((acc, curr) => acc + curr.completion_percentage, 0) / totalStudents)
      : 0;

    return {
      totalStudents,
      enrolledStudents,
      avgCompletion,
    };
  }, [students]);

  // Filter & Sort Pipeline
  const processedStudents = useMemo(() => {
    let result = [...students];

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.full_name.toLowerCase().includes(q) || 
        s.email.toLowerCase().includes(q)
      );
    }

    // 2. Sort results
    result.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'last_active') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, searchQuery, sortKey, sortDirection]);

  // Date formatter
  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never Active';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
            Student <span className="text-indigo-500">Analytics</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Track aggregate completion curves, session triggers, and course enrollments
          </p>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="px-5 py-3 bg-slate-900 border border-slate-800 text-indigo-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-805 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Force Sync Roster'}
        </button>
      </section>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Total Enrollment Base</p>
            <p className="text-2xl font-black text-white tracking-tight">{statsSummary.totalStudents} <span className="text-xs text-slate-500 font-bold">Students</span></p>
          </div>
          {/* Subtle line background */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full pointer-events-none"></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Active Learners</p>
            <p className="text-2xl font-black text-white tracking-tight">{statsSummary.enrolledStudents} <span className="text-xs text-slate-500 font-bold">Syllabus users</span></p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full pointer-events-none"></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Average SLA Completion</p>
            <p className="text-2xl font-black text-white tracking-tight">{statsSummary.avgCompletion}%</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full pointer-events-none"></div>
        </div>
      </section>

      {/* Main Database Table Container */}
      <section className="bg-slate-900 border border-slate-805 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {/* Table Toolbar Header */}
        <div className="p-6 md:p-8 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student email or full name..."
              className="w-full bg-slate-900 border border-slate-800 pl-11 pr-4 py-3 rounded-2xl outline-none focus:border-indigo-500 text-xs font-bold transition-all placeholder:text-slate-650 text-white"
            />
          </div>
          
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Displaying <span className="text-indigo-400">{processedStudents.length}</span> of {students.length} profile entries
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && students.length === 0 && (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-[9px] font-black uppercase tracking-widest text-[#a5b4fc]">Compiling progress indicators...</p>
          </div>
        )}

        {/* Database execution error alert */}
        {error && (
          <div className="m-6 p-6 bg-red-950/40 border-2 border-red-900/40 rounded-[2rem] text-red-400 text-xs font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>Connection failure compilation: {error}</span>
          </div>
        )}

        {/* Table Body */}
        {!loading && processedStudents.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-805 bg-slate-950/20 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-5 px-8">
                    <button onClick={() => handleSort('full_name')} className="flex items-center gap-1.5 hover:text-white">
                      Student Name
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-5 px-6">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1.5 hover:text-white">
                      Registered Email
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-5 px-6">Enrolled Courses</th>
                  <th className="py-5 px-6">
                    <button onClick={() => handleSort('completion_percentage')} className="flex items-center gap-1.5 hover:text-white">
                      Completion %
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-5 px-8">
                    <button onClick={() => handleSort('last_active')} className="flex items-center gap-1.5 hover:text-white">
                      Last Active Trigger
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-805/60 text-xs font-bold leading-normal text-slate-300">
                {processedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-950/20 transition-all">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-805 border border-slate-700 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 uppercase">
                          {s.full_name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-extrabold text-sm tracking-tight leading-none mb-1">{s.full_name}</p>
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-900/30">
                            {s.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6 text-slate-400 font-medium font-mono">{s.email}</td>

                    <td className="py-5 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.enrolled_courses_titles.length > 0 ? (
                          s.enrolled_courses_titles.map((title, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-0.5 bg-slate-950/80 rounded-md border border-slate-800 text-[8px] font-extrabold uppercase tracking-wide text-indigo-300"
                            >
                              {title}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-[10px] uppercase font-black">None enrolled</span>
                        )}
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[80px] bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full ${
                              s.completion_percentage === 100 
                                ? "bg-emerald-500" 
                                : s.completion_percentage > 50 
                                ? "bg-indigo-500" 
                                : "bg-orange-500"
                            }`} 
                            style={{ width: `${s.completion_percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-white font-extrabold">{s.completion_percentage}%</span>
                      </div>
                    </td>

                    <td className="py-5 px-8 text-slate-400 font-medium text-[11px] flex items-center gap-1.5 mt-2.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      {formatLastActive(s.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-24 text-center">
            <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">No matches found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">We couldn't locate any student matching "{searchQuery}". Check the query spelling rules and try again.</p>
          </div>
        )}
      </section>
    </div>
  );
}
