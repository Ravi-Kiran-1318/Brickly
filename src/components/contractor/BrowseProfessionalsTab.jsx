import React, { useState, useEffect } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  IconUsers, IconSearch, IconFilter, IconMapPin, 
  IconCurrencyRupee, IconCalendar, IconCertificate, IconDownload, IconCheck
} from '@tabler/icons-react';

const BrowseProfessionalsTab = () => {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [hiredProfessionalIds, setHiredProfessionalIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ jobRole: '', minExp: '', location: '' });
  const [hireModalData, setHireModalData] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('');

  useEffect(() => {
    fetchProfessionals();
    fetchJobs();
    fetchSentDirectHireRequests();

    const handleNewAvailability = (data) => {
      if (data.post) {
        setPosts(prev => {
          if (prev.some(p => p._id === data.post._id)) return prev;
          return [data.post, ...prev];
        });
      }
    };

    socket.on('contractor:newAvailability', handleNewAvailability);

    return () => {
      socket.off('contractor:newAvailability', handleNewAvailability);
    };
  }, []);

  const fetchSentDirectHireRequests = async () => {
    try {
      const res = await api.get('/api/contractor/direct-hire-requests/sent');
      const hiredIds = res.data
        .filter(req => ['Pending', 'Joined', 'Rejected'].includes(req.status))
        .map(req => req.professionalId?._id || req.professionalId);
      setHiredProfessionalIds(new Set(hiredIds));
    } catch (err) {
      console.error('Failed to fetch sent direct hire requests', err);
    }
  };

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const { jobRole, minExp, location } = filters;
      const res = await api.get(`/api/contractor/professionals?jobRole=${jobRole}&minExp=${minExp}&location=${location}`);
      setPosts(res.data);
    } catch (err) {
      toast.error("Failed to fetch professionals");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/contractor/jobs');
      setJobs(res.data.filter(j => !j.isFilled));
    } catch (err) {
      console.error(err);
    }
  };

  const openHireModal = (post) => {
    if (!post?.professionalId?._id) return toast.error("Professional details not found");
    setHireModalData(post);
    setSelectedJobId('');
  };

  const handleConfirmHire = async () => {
    const post = hireModalData;
    if (!post) return;
    try {
      await api.post(`/api/contractor/direct-hire/${post.professionalId._id}`, {
        jobRole: post.jobRole,
        workSiteLocation: post.locationPreference,
        salary: post.expectedSalary,
        duration: 'Long term',
        jobPostId: selectedJobId || null
      });
      toast.success("Direct hire request sent successfully");
      setHiredProfessionalIds(prev => new Set([...prev, post.professionalId._id]));
      setHireModalData(null);
      // Removed fetchProfessionals() to not disrupt the UI, state handles it
    } catch (err) {
      toast.error(err.response?.data?.message || "Hiring failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 md:p-6 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
           <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
           <input 
             value={filters.jobRole} onChange={(e) => setFilters({...filters, jobRole: e.target.value})}
             placeholder="Search Skill (e.g. Electrician, Civil Engineer)" 
             className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-accent/10 transition-all text-primary dark:text-white font-bold" 
           />
        </div>
        <div className="flex-1 relative">
           <IconMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
           <input 
             value={filters.location} onChange={(e) => setFilters({...filters, location: e.target.value})}
             placeholder="Work City/Area" 
             className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:ring-4 focus:ring-accent/10 transition-all text-primary dark:text-white font-bold" 
           />
        </div>
        <button 
          onClick={fetchProfessionals}
          className="bg-primary text-white font-black px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <IconFilter size={20} /> Apply
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
           [1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : posts.length > 0 ? posts.map((post) => (
          <motion.div 
            layout 
            key={post._id} 
            className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group"
          >
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-xl">
                  {post.professionalId?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="font-black text-primary dark:text-white uppercase tracking-tight">{post.professionalId?.name || 'Professional'}</h4>
                  <p className="text-xs font-bold text-accent uppercase tracking-widest">{post.jobRole}</p>
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <IconUsers size={16} className="text-slate-400" /> {post.yearsOfExperience} Years Experience
                 </div>
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <IconMapPin size={16} className="text-slate-400" /> {post.locationPreference}
                 </div>
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <IconCurrencyRupee size={16} className="text-slate-400" /> {post.expectedSalary}
                 </div>
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <IconCalendar size={16} className="text-slate-400" /> From {new Date(post.availableFrom).toLocaleDateString()}
                 </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {post.skillTags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button className="flex-1 py-3 px-2 rounded-xl text-xs font-black bg-slate-50 dark:bg-slate-800 text-primary dark:text-white flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all">
                <IconDownload size={16} /> Resume
              </button>
              {hiredProfessionalIds.has(post.professionalId?._id) ? (
                <button 
                  disabled
                  className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-green-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/10 cursor-not-allowed opacity-90 transition-all"
                >
                  <IconCheck size={16} /> Hired
                </button>
              ) : (
                <button 
                  onClick={() => openHireModal(post)}
                  className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-accent text-white flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all"
                >
                  Hire Now
                </button>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconUsers size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No professionals available</h3>
             <p className="text-slate-400 max-w-sm mx-auto">None match your current filters. Try broadening your search or check back later.</p>
          </div>
        )}
      </div>

      {/* Hire Modal */}
      {hireModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHireModalData(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Direct Hire Request</h3>
            <p className="text-slate-500 text-sm mb-6">Send a hire request to <strong className="text-primary dark:text-white">{hireModalData.professionalId?.name}</strong>.</p>
            
            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Link to Job Post (Optional)</label>
                <select 
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                >
                  <option value="">No specific job post</option>
                  {jobs.map(job => (
                    <option key={job._id} value={job._id}>
                      {job.jobRole} ({job.workLocation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setHireModalData(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
               <button onClick={handleConfirmHire} className="flex-1 py-3 bg-accent text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">Send Request</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BrowseProfessionalsTab;
