import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  IconPlus, IconBriefcase, IconMapPin, IconCurrencyRupee, 
  IconClock, IconUsers, IconTrash, IconChevronDown, IconChevronUp
} from '@tabler/icons-react';

const JobPostsTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [formData, setFormData] = useState({
    jobRole: '', workLocation: '', salary: '', 
    salaryType: 'monthly', duration: '', requiredSkills: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/contractor/jobs');
      setJobs(res.data);
    } catch (err) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim())
      };
      await api.post('/api/contractor/jobs', payload);
      toast.success("Job posted successfully!");
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      toast.error("Failed to post job");
    }
  };

  const handleHire = async (jobId, professionalId) => {
    if (!window.confirm("Are you sure you want to hire this professional? This will fill the job post.")) return;
    try {
      await api.post(`/api/contractor/jobs/${jobId}/hire/${professionalId}`);
      toast.success("Professional hired!");
      fetchJobs();
    } catch (err) {
      toast.error("Hiring failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white">Active Job Posts</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
        >
          {showForm ? 'Cancel' : <><IconPlus size={20} /> Post New Job</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Job Role</label>
              <input required name="jobRole" value={formData.jobRole} onChange={(e) => setFormData({...formData, jobRole: e.target.value})} placeholder="e.g. Lead Mason" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Work Location</label>
              <input required name="workLocation" value={formData.workLocation} onChange={(e) => setFormData({...formData, workLocation: e.target.value})} placeholder="e.g. Bannerghatta, Bangalore" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Salary (INR)</label>
              <input required type="number" name="salary" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} placeholder="e.g. 25000" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Salary Type</label>
              <select name="salaryType" value={formData.salaryType} onChange={(e) => setFormData({...formData, salaryType: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all">
                <option value="monthly">Monthly</option>
                <option value="contract">Project Contract</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Duration</label>
              <input required name="duration" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 3 Months" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Skills (Comma separated)</label>
              <input name="requiredSkills" value={formData.requiredSkills} onChange={(e) => setFormData({...formData, requiredSkills: e.target.value})} placeholder="Masonry, Tiles, Plastering" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black mt-2 hover:bg-slate-800 transition-all">Create Job Post</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {jobs.length > 0 ? jobs.map((job) => (
          <div key={job._id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/20 shadow-sm">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <IconBriefcase size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary dark:text-white capitalize">{job.jobRole}</h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><IconMapPin size={16} /> {job.workLocation}</span>
                    <span className="flex items-center gap-1.5"><IconCurrencyRupee size={16} /> {job.salary} / {job.salaryType}</span>
                    <span className="flex items-center gap-1.5"><IconClock size={16} /> {job.duration}</span>
                    <span className="flex items-center gap-1.5 text-accent"><IconUsers size={16} /> {job.applicants?.length || 0} applicants</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-2 transition-all"
                >
                  View Applicants {expandedJob === job._id ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                </button>
                <button 
                  onClick={() => { if(window.confirm('Delete this job post?')) api.delete(`/api/contractor/jobs/${job._id}`).then(fetchJobs); }}
                  className="p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expandedJob === job._id && (
                <motion.div 
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 overflow-hidden"
                >
                  <div className="p-8 space-y-4 text-slate-500">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Applicant List</h4>
                    {job.applicants && job.applicants.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {job.applicants.map((app) => (
                           <div key={app._id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm hover:shadow-md transition-all gap-4">
                             <div className="space-y-3">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-black flex items-center justify-center shrink-0">
                                   {app.professionalId?.name?.charAt(0) || 'P'}
                                 </div>
                                 <div>
                                   <p className="font-black text-primary dark:text-white uppercase tracking-tight text-sm">
                                     {app.professionalId?.name || 'Unknown Professional'}
                                   </p>
                                   <p className="text-[10px] font-bold text-slate-400">
                                     Applied on {new Date(app.appliedAt).toLocaleDateString()}
                                   </p>
                                 </div>
                               </div>

                               <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                 <div>
                                   <span className="text-[10px] uppercase text-slate-400 block font-normal">Trade Role</span>
                                   {app.professionalId?.jobRole || 'N/A'}
                                 </div>
                                 <div>
                                   <span className="text-[10px] uppercase text-slate-400 block font-normal">Experience</span>
                                   {app.professionalId?.yearsOfExperience !== undefined ? `${app.professionalId.yearsOfExperience} Years` : 'N/A'}
                                 </div>
                                 <div>
                                   <span className="text-[10px] uppercase text-slate-400 block font-normal">Email</span>
                                   <span className="break-all">{app.professionalId?.email || 'N/A'}</span>
                                 </div>
                                 <div>
                                   <span className="text-[10px] uppercase text-slate-400 block font-normal">Phone</span>
                                   {app.professionalId?.phone || 'N/A'}
                                 </div>
                                </div>

                                {(app.professionalId?.locationPreference || app.professionalId?.qualification) && (
                                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                      <span className="text-[10px] uppercase text-slate-400 block font-normal">Location Pref.</span>
                                      {app.professionalId?.locationPreference || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase text-slate-400 block font-normal">Qualification</span>
                                      {app.professionalId?.qualification || 'N/A'}
                                    </div>
                                  </div>
                                )}

                                {app.professionalId?.about && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] uppercase text-slate-400 block font-bold mb-0.5">About</span>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                      {app.professionalId.about}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <a 
                                  href={`/profile/${app.professionalId?._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-2.5 px-2 rounded-xl text-xs font-black bg-slate-50 dark:bg-slate-800 text-primary dark:text-white flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-center"
                                >
                                  View Profile
                                </a>
                                <button 
                                  onClick={() => handleHire(job._id, app.professionalId?._id)}
                                  className="flex-1 py-2.5 px-2 rounded-xl text-xs font-black bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-1 shadow-lg shadow-green-500/10 transition-all"
                                >
                                  Hire Now
                                </button>
                              </div>
                            </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-sm font-bold text-slate-400">No applications received yet.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconBriefcase size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No active jobs</h3>
             <p className="text-slate-400 max-w-sm mx-auto">You haven't posted any jobs yet. Start by clicking the "Post New Job" button.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPostsTab;
