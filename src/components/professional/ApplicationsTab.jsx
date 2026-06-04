import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion } from 'framer-motion';
import { 
  IconClipboardText, IconBuildingSkyscraper, IconMapPin, 
  IconCalendarTime, IconCurrencyRupee, IconCircleCheck, 
  IconX, IconClock, IconEye, IconUserCircle
} from '@tabler/icons-react';

const STATUS_COLORS = {
  'Applied': 'bg-blue-100 text-blue-600 border-blue-200',
  'Viewed': 'bg-purple-100 text-purple-600 border-purple-200',
  'Shortlisted': 'bg-orange-100 text-orange-600 border-orange-200',
  'Hired': 'bg-green-100 text-green-600 border-green-200',
  'Rejected': 'bg-red-100 text-red-600 border-red-200'
};

const ApplicationsTab = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/api/professional/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading your applications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div>
            <h2 className="text-2xl font-black text-primary dark:text-white">Applied Jobs</h2>
            <p className="text-sm text-slate-400 font-medium tracking-tight">Track the progress of your job applications.</p>
         </div>
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-2 rounded-2xl">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total: </span>
            <span className="text-lg font-black text-primary dark:text-white ml-2">{applications.length}</span>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {applications.length > 0 ? applications.map(app => (
          <ApplicationCard key={app._id} application={app} />
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconClipboardText size={60} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold">You haven't applied to any jobs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ApplicationCard = ({ application }) => {
  const job = application.jobPostId;
  const contractor = application.contractorId;

  if (!job) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:shadow-lg hover:border-accent transition-all relative overflow-hidden"
    >
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600 shrink-0">
           <IconBuildingSkyscraper size={32} />
        </div>
        <div>
           <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-black text-primary dark:text-white tracking-tight">{job.jobRole}</h3>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${STATUS_COLORS[application.status] || 'bg-slate-100'}`}>
                {application.status}
              </span>
           </div>
           <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-0.5 rounded-full mt-1">
              <IconUserCircle size={16} /> {contractor?.companyName || contractor?.name}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
         <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCurrencyRupee size={10} /> Salary</span>
            <span className="text-base font-black text-accent leading-none">₹{job.salary}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{job.salaryType}</span>
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconMapPin size={10} /> Location</span>
            <span className="text-sm font-bold text-primary dark:text-blue-100">{job.workLocation}</span>
         </div>
         <div className="flex flex-col sm:col-span-1 col-span-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCalendarTime size={10} /> Applied On</span>
            <span className="text-sm font-bold text-primary dark:text-blue-100">{new Date(application.appliedAt).toLocaleDateString()}</span>
         </div>
      </div>

      <div className="flex lg:flex-col items-center lg:items-end gap-3 shrink-0">
         <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center min-w-[80px]">
             {application.status === 'Applied' && <IconClock size={24} className="text-slate-400" />}
             {application.status === 'Viewed' && <IconEye size={24} className="text-purple-500" />}
             {application.status === 'Shortlisted' && <IconCircleCheck size={24} className="text-orange-500 animate-bounce" />}
             {application.status === 'Hired' && <IconCircleCheck size={24} className="text-green-500" />}
             {application.status === 'Rejected' && <IconX size={24} className="text-red-500" />}
             <span className="text-[9px] font-black uppercase text-slate-400 mt-1">{application.status}</span>
         </div>
      </div>
    </motion.div>
  );
};

export default ApplicationsTab;
