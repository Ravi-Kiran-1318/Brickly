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
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ jobRole: '', minExp: '', location: '' });
  const [hireModalData, setHireModalData] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [noticePeriodDays, setNoticePeriodDays] = useState(7);
  const [includeSundays, setIncludeSundays] = useState(false);

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

    const handleNewProfessionalAvailable = (data) => {
      if (!data.professionalId) return;
      
      const newCardId = data.post?._id || data.professionalId;
      toast.success(`A new professional ${data.name || 'Professional'} is now available as ${data.jobRole || 'Professional'}!`);
      
      const newCard = {
        _id: newCardId,
        professionalId: {
          _id: data.professionalId,
          name: data.name,
          jobRole: data.jobRole,
          yearsOfExperience: data.experience,
          locationPreference: data.location,
          isVisible: data.isVisible,
          avatar: data.avatar || null,
          isEmployed: data.isEmployed || false,
          isServingNotice: data.isServingNotice || false,
          noticeEndDate: data.noticeEndDate || null
        },
        jobRole: data.jobRole,
        yearsOfExperience: data.experience,
        locationPreference: data.location,
        expectedSalary: data.post?.expectedSalary || 'Negotiable',
        availableFrom: data.post?.availableFrom || new Date().toISOString(),
        skillTags: data.post?.skillTags || []
      };

      setPosts(prev => {
        if (prev.some(p => (p.professionalId?._id || p.professionalId) === data.professionalId)) {
          return prev;
        }
        return [newCard, ...prev];
      });

      setHighlightedIds(prev => {
        const next = new Set(prev);
        next.add(newCardId);
        return next;
      });

      setTimeout(() => {
        setHighlightedIds(prev => {
          const next = new Set(prev);
          next.delete(newCardId);
          return next;
        });
      }, 2000);
    };

    const handleProfessionalWentOffline = (data) => {
      if (!data.professionalId) return;
      setPosts(prev => prev.filter(p => (p.professionalId?._id || p.professionalId) !== data.professionalId));
    };

    socket.on('contractor:newAvailability', handleNewAvailability);
    socket.on('newProfessionalAvailable', handleNewProfessionalAvailable);
    socket.on('professionalWentOffline', handleProfessionalWentOffline);

    return () => {
      socket.off('contractor:newAvailability', handleNewAvailability);
      socket.off('newProfessionalAvailable', handleNewProfessionalAvailable);
      socket.off('professionalWentOffline', handleProfessionalWentOffline);
    };
  }, []);

  const isRecentRejection = (req) => {
    if (req.status !== 'Rejected') return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateToCheck = req.updatedAt || req.createdAt;
    return new Date(dateToCheck) >= sevenDaysAgo;
  };

  const getProfessionalStatus = (pId) => {
    const hasJoined = sentRequests.some(r => {
      const id = r.professionalId?._id || r.professionalId;
      return id === pId && r.status === 'Joined';
    });
    if (hasJoined) return 'Hired';

    const hasPending = sentRequests.some(r => {
      const id = r.professionalId?._id || r.professionalId;
      return id === pId && r.status === 'Pending';
    });
    if (hasPending) return 'Pending';

    const generalBlocked = sentRequests.some(r => {
      const id = r.professionalId?._id || r.professionalId;
      return id === pId && !r.jobPostId && isRecentRejection(r);
    });

    if (!generalBlocked) return 'Available';

    const hasUnblockedJob = jobs.some(job => {
      const isJobBlocked = sentRequests.some(r => {
        const id = r.professionalId?._id || r.professionalId;
        const rJobId = r.jobPostId?._id || r.jobPostId;
        return id === pId && rJobId === job._id && isRecentRejection(r);
      });
      return !isJobBlocked;
    });

    if (hasUnblockedJob) return 'Available';

    return 'Declined';
  };

  const fetchSentDirectHireRequests = async () => {
    try {
      const res = await api.get('/api/contractor/direct-hire-requests/sent');
      setSentRequests(res.data);
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
    setNoticePeriodDays(7);
    
    // Find first available option when modal is opened
    const pId = post.professionalId._id;
    const isGeneralBlocked = sentRequests.some(r => {
      const id = r.professionalId?._id || r.professionalId;
      return id === pId && !r.jobPostId && (r.status === 'Pending' || isRecentRejection(r));
    });
    
    let defaultJobId = '';
    if (!isGeneralBlocked) {
      defaultJobId = '';
    } else {
      const firstAvailableJob = jobs.find(job => {
        const isJobBlocked = sentRequests.some(r => {
          const id = r.professionalId?._id || r.professionalId;
          const rJobId = r.jobPostId?._id || r.jobPostId;
          return id === pId && rJobId === job._id && (r.status === 'Pending' || isRecentRejection(r));
        });
        return !isJobBlocked;
      });
      defaultJobId = firstAvailableJob ? firstAvailableJob._id : '';
    }
    setSelectedJobId(defaultJobId);

    // Sync includeSundays
    if (defaultJobId) {
      const selectedJob = jobs.find(j => j._id === defaultJobId);
      setIncludeSundays(selectedJob ? (selectedJob.includeSundays || false) : false);
    } else {
      setIncludeSundays(false);
    }
  };

  const handleJobChange = (jobId) => {
    setSelectedJobId(jobId);
    if (jobId) {
      const selectedJob = jobs.find(j => j._id === jobId);
      setIncludeSundays(selectedJob ? (selectedJob.includeSundays || false) : false);
    } else {
      setIncludeSundays(false);
    }
  };

  const handleConfirmHire = async () => {
    const post = hireModalData;
    if (!post) return;
    try {
      const res = await api.post(`/api/contractor/direct-hire/${post.professionalId._id}`, {
        jobRole: post.jobRole,
        workSiteLocation: post.locationPreference,
        salary: post.expectedSalary,
        duration: 'Long term',
        jobPostId: selectedJobId || null,
        noticePeriodDays: parseInt(noticePeriodDays) || 7,
        includeSundays: includeSundays
      });
      toast.success("Direct hire request sent successfully");
      if (res.data?.request) {
        setSentRequests(prev => [res.data.request, ...prev]);
      } else {
        fetchSentDirectHireRequests();
      }
      setHireModalData(null);
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
            className={`bg-white dark:bg-slate-900 p-6 rounded-[32px] border flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group ${
              highlightedIds.has(post._id) 
                ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] ring-4 ring-green-500/20 animate-pulse' 
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-xl">
                  {post.professionalId?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="font-black text-primary dark:text-white uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                    {post.professionalId?.name || 'Professional'}
                    {post.professionalId?.isTrustedProfessional && (
                      <span className="bg-yellow-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm shadow-yellow-500/30 shrink-0" title="Trusted Professional Badge">
                        ★ Trusted
                      </span>
                    )}
                    {post.isCrewPost && (
                      <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm shadow-blue-500/30 shrink-0" title={`Crew of ${post.crewSize}`}>
                        👥 Crew of {post.crewSize}
                      </span>
                    )}
                  </h4>
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
              {(() => {
                const status = getProfessionalStatus(post.professionalId?._id);
                if (status === 'Hired') {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-green-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/10 cursor-not-allowed opacity-90 transition-all"
                    >
                      <IconCheck size={16} /> Hired
                    </button>
                  );
                }
                if (post.professionalId?.isServingNotice) {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all"
                      title={`Serving notice until ${new Date(post.professionalId.noticeEndDate).toLocaleDateString()}`}
                    >
                      Notice Period
                    </button>
                  );
                }
                if (post.professionalId?.isEmployed) {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all"
                      title="Candidate is currently employed by another contractor."
                    >
                      Employed
                    </button>
                  );
                }
                const stats = post.professionalId?.directHireStats;
                if (stats?.cooldownActive) {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all"
                      title="Direct hire cooldown is active. You can retry after 48 hours."
                    >
                      Retry in {stats.cooldownHoursLeft}h
                    </button>
                  );
                }
                if (stats?.totalAttempts >= 3) {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all"
                      title="Maximum number of direct hire attempts (3) has been reached."
                    >
                      Max Requests Sent
                    </button>
                  );
                }
                if (status === 'Pending') {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-orange-100 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all animate-pulse"
                    >
                      Pending Response
                    </button>
                  );
                }
                if (status === 'Declined') {
                  return (
                    <button 
                      disabled
                      className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-850 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed transition-all"
                    >
                      Declined
                    </button>
                  );
                }
                return (
                  <button 
                    onClick={() => openHireModal(post)}
                    className="flex-[2] py-3 px-2 rounded-xl text-xs font-black bg-accent text-white flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all"
                  >
                    Hire Now
                  </button>
                );
              })()}
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
                  onChange={(e) => handleJobChange(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                >
                  {(() => {
                    const pId = hireModalData.professionalId?._id;
                    const r = sentRequests.find(req => {
                      const id = req.professionalId?._id || req.professionalId;
                      return id === pId && !req.jobPostId;
                    });
                    let disabled = false;
                    let suffix = "";
                    if (r) {
                      if (r.status === 'Pending') {
                        disabled = true;
                        suffix = " (Pending Response)";
                      } else if (isRecentRejection(r)) {
                        disabled = true;
                        const dateToCheck = r.updatedAt || r.createdAt;
                        const daysLeft = Math.ceil((new Date(dateToCheck).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                        suffix = ` (Declined - Wait ${daysLeft}d)`;
                      }
                    }
                    return (
                      <option value="" disabled={disabled}>
                        No specific job post{suffix}
                      </option>
                    );
                  })()}
                  {jobs.map(job => {
                    const pId = hireModalData.professionalId?._id;
                    const r = sentRequests.find(req => {
                      const id = req.professionalId?._id || req.professionalId;
                      const rJobId = req.jobPostId?._id || req.jobPostId;
                      return id === pId && rJobId === job._id;
                    });
                    let disabled = false;
                    let suffix = "";
                    if (r) {
                      if (r.status === 'Pending') {
                        disabled = true;
                        suffix = " (Pending Response)";
                      } else if (isRecentRejection(r)) {
                        disabled = true;
                        const dateToCheck = r.updatedAt || r.createdAt;
                        const daysLeft = Math.ceil((new Date(dateToCheck).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                        suffix = ` (Declined - Wait ${daysLeft}d)`;
                      }
                    }
                    return (
                      <option key={job._id} value={job._id} disabled={disabled}>
                        {job.jobRole} ({job.workLocation}){suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notice Period (Days)</label>
                <input 
                  type="number"
                  min="0"
                  max="30"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="directHireIncludeSundays"
                  checked={includeSundays} 
                  onChange={(e) => setIncludeSundays(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 accent-accent cursor-pointer"
                />
                <label htmlFor="directHireIncludeSundays" className="text-xs font-bold text-slate-500 uppercase tracking-tighter cursor-pointer select-none">
                  Include Sunday Work/Shifts
                </label>
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
