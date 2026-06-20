import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconCalendarEvent, IconCircleCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import api from '../../api';
import toast from 'react-hot-toast';

const AttendanceLogModal = ({ isOpen, onClose, member }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAttendanceLog = async () => {
    if (!member) return;
    setLoading(true);
    try {
      // Check if ID is member._id (the HiredWorker ID)
      const hiredWorkerId = member.hiredWorkerId || member._id;
      const res = await api.get(`/api/contractor/hired-worker/${hiredWorkerId}/attendance-log?month=${selectedMonth}`);
      if (res.data?.success) {
        setAttendanceData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to fetch attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && member) {
      fetchAttendanceLog();
    }
  }, [isOpen, member, selectedMonth]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const getCalendarDays = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun, ..., 6 = Sat
    const totalDays = new Date(year, month, 0).getDate();

    const days = [];
    // Pad previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  };

  const getRecordForDay = (day) => {
    if (!day || !attendanceData?.records) return null;
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    return attendanceData.records.find(r => r.date === dateStr);
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = getCalendarDays();

  const getMonthYearString = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
                  <IconCalendarEvent size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Attendance Log</h3>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {member.name || member.professionalId?.name} • {member.jobRole}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                    Duration: {new Date(member.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to {member.endDate ? new Date(member.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <IconX size={18} />
              </button>
            </div>

            {/* Month Navigation & Selector */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl mb-6">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400"
              >
                <IconChevronLeft size={20} />
              </button>

              <div className="text-center">
                <span className="font-black text-sm text-primary dark:text-white mr-2">{getMonthYearString()}</span>
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="opacity-0 w-6 absolute cursor-pointer"
                />
              </div>

              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400"
              >
                <IconChevronRight size={20} />
              </button>
            </div>

            {/* Summary Block */}
            {attendanceData && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Days</p>
                  <p className="text-xl font-black text-orange-500">
                    {attendanceData.presentCount} <span className="text-xs font-bold text-slate-400">out of {attendanceData.totalDays} days</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-green-500 uppercase bg-green-500/10 px-3 py-1.5 rounded-xl">
                  <IconCircleCheck size={16} /> Verified
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-400 uppercase">Loading logs...</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                  {daysOfWeek.map(day => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-10" />;
                    const record = getRecordForDay(day);
                    const isPresent = record?.status === 'present';
                    
                    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                    const currentDateObj = new Date(dateStr);
                    currentDateObj.setHours(0,0,0,0);
                    
                    const start = new Date(member.startDate);
                    start.setHours(0,0,0,0);
                    
                    const end = member.endDate ? new Date(member.endDate) : null;
                    if (end) end.setHours(0,0,0,0);
                    
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    const isWithinContract = currentDateObj >= start && (!end || currentDateObj <= end);
                    const isPastOrToday = currentDateObj <= today;
                    const isSunday = currentDateObj.getDay() === 0;
                    const isSundayHoliday = isSunday && !member.includeSundays;
                    
                    // Sundays are holidays unless Sunday work is included
                    const isWorkDay = isWithinContract && isPastOrToday && (!isSunday || member.includeSundays);
                    const isAbsent = isWorkDay && !isPresent;
                    
                    let cellClass = '';
                    let tooltip = '';
                    
                    if (isPresent) {
                      cellClass = 'bg-green-500 text-white shadow-md shadow-green-500/20';
                      tooltip = record.checkInAt 
                        ? `Checked in: ${new Date(record.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                        : 'Present';
                    } else if (isSundayHoliday && isWithinContract) {
                      // Sunday Holiday within active contract
                      cellClass = 'bg-sky-100 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-650 dark:text-sky-400 font-bold';
                      tooltip = 'Sunday (Holiday)';
                    } else {
                      const isToday = currentDateObj.getTime() === today.getTime();
                      if (isToday && isWithinContract) {
                        cellClass = 'bg-amber-500 text-white shadow-md shadow-amber-500/20';
                        tooltip = 'Today (Pending check-in)';
                      } else if (isAbsent) {
                        cellClass = 'bg-red-500 text-white shadow-md shadow-red-500/20';
                        tooltip = 'Absent';
                      } else if (isWithinContract) {
                        cellClass = 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold';
                        tooltip = 'Scheduled Work Day';
                      } else {
                        cellClass = 'bg-slate-50/40 dark:bg-slate-950/40 border border-transparent text-slate-300 dark:text-slate-700 cursor-default pointer-events-none';
                        tooltip = 'Out of Contract';
                      }
                    }
                    
                    return (
                      <div 
                        key={`day-${day}`} 
                        className={`h-10 flex flex-col items-center justify-center rounded-xl font-black text-xs transition-all relative group ${cellClass}`}
                      >
                        {day}
                        {tooltip && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 dark:bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-md whitespace-nowrap z-20 shadow-lg border border-slate-800 dark:border-slate-700">
                            {tooltip}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-md shadow-sm"></span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-md shadow-sm"></span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-md shadow-sm"></span>
                <span>Pending Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-md"></span>
                <span>Sunday (Holiday) *</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"></span>
                <span>Scheduled</span>
              </div>
            </div>

            <div className="text-[9px] text-center text-slate-450 dark:text-slate-500 font-bold mt-2 uppercase tracking-wide">
              {member.includeSundays 
                ? "* Sunday shifts are included for this worker"
                : "* Sunday is excluded from expected workdays & attendance rates"}
            </div>

            <div className="mt-6">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AttendanceLogModal;
