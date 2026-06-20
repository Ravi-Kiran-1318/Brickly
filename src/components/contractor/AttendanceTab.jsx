import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconCalendarStats, IconX, IconCircleCheck, IconCircleX, IconUser } from '@tabler/icons-react';
import api from '../../api';
import toast from 'react-hot-toast';

const AttendanceTab = () => {
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLog, setMemberLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/api/contractor/attendance-overview');
      if (res.data?.success) {
        setOverview(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const viewMemberLog = async (member) => {
    setSelectedMember(member);
    setLogLoading(true);
    try {
      const res = await api.get(`/api/contractor/hired-worker/${member.hiredWorkerId}/attendance-log`);
      if (res.data?.success) {
        setMemberLog(res.data.records || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance log');
    } finally {
      setLogLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Team Attendance Rates</h2>
        <p className="text-slate-500 text-sm">Monitor check-in rates and daily verification summaries for active and completed contracts.</p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overview.length > 0 ? (
          overview.map(m => (
            <motion.div
              key={m.hiredWorkerId}
              whileHover={{ y: -4 }}
              onClick={() => viewMemberLog(m)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col gap-4 group hover:border-accent"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                  {m.name?.charAt(0).toUpperCase() || <IconUser size={18} />}
                </div>
                <div>
                  <h3 className="font-black text-primary dark:text-white text-base truncate group-hover:text-accent transition-colors">{m.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{m.jobRole}</p>
                </div>
              </div>

              {/* Attendance Rate Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider">Attendance Rate</span>
                  <span className={m.attendanceRate >= 80 ? 'text-green-600' : m.attendanceRate >= 50 ? 'text-amber-600' : 'text-red-500'}>
                    {m.attendanceRate}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${m.attendanceRate}%`,
                      backgroundColor: m.attendanceRate >= 80 ? '#16A34A' : m.attendanceRate >= 50 ? '#D97706' : '#EF4444'
                    }}
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold">
                <span className="text-slate-400">Present</span>
                <span className="text-primary dark:text-white">{m.presentDays} / {m.totalExpectedDays} days</span>
              </div>

              {/* Window dates */}
              <div className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 flex justify-between">
                <span>Start: {new Date(m.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span>End: {m.endDate ? new Date(m.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <IconCalendarStats size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold">No active or completed team members found.</p>
          </div>
        )}
      </div>

      {/* Detail Modal — click a card to see daily log */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-primary dark:text-white uppercase tracking-tight">Attendance History</h3>
                <p className="text-xs font-semibold text-slate-400">{selectedMember.name} • {selectedMember.jobRole}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <IconX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {logLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Loading logs...</p>
                </div>
              ) : memberLog.length > 0 ? (
                memberLog.map(r => (
                  <div key={r._id} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`text-xs font-black flex items-center gap-1 ${r.status === 'present' ? 'text-green-600' : 'text-red-500'}`}>
                      {r.status === 'present' ? (
                        <>
                          <IconCircleCheck size={16} /> Present ({new Date(r.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                        </>
                      ) : (
                        <>
                          <IconCircleX size={16} /> Absent
                        </>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                  No attendance check-ins recorded for this worker.
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              className="w-full mt-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
