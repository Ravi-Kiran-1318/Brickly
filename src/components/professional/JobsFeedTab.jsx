import React, { useState, useEffect } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBriefcase, IconMapPin, IconClock, IconCurrencyRupee,
  IconFilter, IconSearch, IconChevronRight, IconCircleCheck,
  IconAlertCircle
} from '@tabler/icons-react';

const JobsFeedTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minSalary: '',
    duration: '',
    location: ''
  });

  useEffect(() => {
    fetchJobs();

    const handleNewJob = (data) => {
      if (data.job) {
        setJobs(prev => {
          // Avoid duplicate items
          if (prev.some(j => j._id === data.job._id)) return prev;
          return [data.job, ...prev];
        });
      }
    };

    socket.on('professional:newJob', handleNewJob);

    return () => {
      socket.off('professional:newJob', handleNewJob);
    };
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/professional/jobs', { params: filters });
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/api/professional/jobs/${jobId}/apply`);
      setJobs(jobs.map(j => j._id === jobId ? { ...j, hasApplied: true } : j));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to apply');
    }
  };

  if (loading && jobs.length === 0) return <div className="p-8 text-center text-slate-400 font-bold tracking-widest uppercase text-xs">Scanning for opportunities...</div>;

  return (
    <div className="space-y-8">
      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text" placeholder="Search by location..."
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
            value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
        </div>
        <div className="relative w-full md:w-48">
          <IconCurrencyRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="number" placeholder="Min Salary"
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
            value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })}
          />
        </div>
        <div className="relative w-full md:w-48">
          <IconClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
            value={filters.duration} onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
          >
            <option value="">Any Duration</option>
            <option value="Short term">Short term</option>
            <option value="Long term">Long term</option>
            <option value="Daily basis">Daily basis</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.map(job => (
          <JobCard key={job._id} job={job} onApply={() => handleApply(job._id)} />
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <IconBriefcase size={60} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold">No matching jobs found right now.</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const JobCard = ({ job, onApply }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-accent transition-all group overflow-hidden relative"
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <IconBriefcase size={28} />
          </div>
          <div>
            <h4 className="text-xl font-black text-primary dark:text-white leading-tight">{job.jobRole}</h4>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{job.duration}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase">Offering</p>
          <p className="text-xl font-black text-accent leading-none">₹{job.salary}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Per {job.salaryType === 'monthly' ? 'Month' : 'Contract'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3">
          <IconMapPin size={20} className="text-slate-400" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Location</p>
            <p className="text-sm font-bold text-primary dark:text-blue-100">{job.workLocation}</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3">
          <IconClock size={20} className="text-slate-400" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Posted</p>
            <p className="text-sm font-bold text-primary dark:text-blue-100">{new Date(job.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Required Skills</p>
        <div className="flex flex-wrap gap-2">
          {job.requiredSkills?.map((skill, i) => (
            <span key={i} className="text-[10px] font-black uppercase px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-lg border border-blue-100/20">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-white/5">
        <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
          <IconAlertCircle size={16} />
          {job.facilities || 'No special facilities mentioned'}
        </div>

        {job.hasApplied ? (
          <div className="flex items-center gap-2 text-green-500 font-black text-sm uppercase tracking-widest px-6 py-3 bg-green-500/10 rounded-2xl border border-green-500/20">
            <IconCircleCheck size={20} /> Applied
          </div>
        ) : (
          <button
            onClick={onApply}
            className="bg-accent text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            Apply Now <IconChevronRight size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default JobsFeedTab;
