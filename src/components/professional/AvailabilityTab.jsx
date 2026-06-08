import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconCalendarEvent, IconUpload, IconFileText, IconCertificate, 
  IconTrash, IconCircleCheck, IconEdit, IconX, IconEye, 
  IconEyeOff, IconAlertTriangle, IconPackage
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const ROLE_HIERARCHY = {
  'Plumber': [
    'Plumbing Helper',
    'Junior Plumber',
    'Plumber',
    'Senior Plumber',
    'Plumbing Supervisor',
    'Plumbing Foreman'
  ],
  'Electrician': [
    'Electrical Helper',
    'Junior Electrician',
    'Electrician',
    'Senior Electrician',
    'Electrical Supervisor',
    'Electrical Foreman'
  ],
  'Mason': [
    'Mason Helper',
    'Junior Mason',
    'Mason',
    'Senior Mason',
    'Masonry Supervisor',
    'Masonry Foreman'
  ],
  'Carpenter': [
    'Carpentry Helper',
    'Junior Carpenter',
    'Carpenter',
    'Senior Carpenter',
    'Carpentry Supervisor',
    'Carpentry Foreman'
  ],
  'Welder': [
    'Welding Helper',
    'Junior Welder',
    'Welder',
    'Senior Welder',
    'Welding Supervisor',
    'Welding Foreman'
  ],
  'Painter': [
    'Painting Helper',
    'Junior Painter',
    'Painter',
    'Senior Painter',
    'Painting Supervisor',
    'Painting Foreman'
  ],
  'Tiler': [
    'Tiling Helper',
    'Junior Tiler',
    'Tiler',
    'Senior Tiler',
    'Tiling Supervisor',
    'Tiling Foreman'
  ],
  'Roofer': [
    'Roofing Helper',
    'Junior Roofer',
    'Roofer',
    'Senior Roofer',
    'Roofing Supervisor',
    'Roofing Foreman'
  ],
  'AC Technician': [
    'AC Helper',
    'Junior AC Technician',
    'AC Technician',
    'Senior AC Technician',
    'HVAC Supervisor',
    'HVAC Foreman'
  ],
  'Civil Engineer': [
    'Junior Civil Engineer',
    'Civil Engineer',
    'Senior Civil Engineer',
    'Civil Engineering Lead',
    'Civil Engineering Manager'
  ],
  'Architect': [
    'Junior Architect',
    'Architect',
    'Senior Architect',
    'Principal Architect',
    'Lead Architect'
  ],
  'Interior Designer': [
    'Junior Interior Designer',
    'Interior Designer',
    'Senior Interior Designer',
    'Lead Interior Designer',
    'Principal Interior Designer'
  ],
  'Foreman': [
    'Assistant Foreman',
    'Foreman',
    'Senior Foreman',
    'General Foreman',
    'Site Supervisor'
  ]
};

const AvailabilityTab = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
  
  const userTrade = profile?.jobRole || profile?.trade || '';
  const roleOptions = ROLE_HIERARCHY[userTrade] || [];
  
  const [formData, setFormData] = useState({
    jobRole: user?.jobRole || '',
    yearsOfExperience: user?.yearsOfExperience || '',
    expectedSalary: '',
    availableFrom: '',
    locationPreference: user?.locationPreference || '',
    skillTags: []
  });
  
  const [resume, setResume] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  // Features State
  const [directHireRequests, setDirectHireRequests] = useState([]);
  const [rejectingId, setRejectingId] = useState(null); // id of direct hire request being rejected
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinConfirm, setJoinConfirm] = useState(null);

  // Resignation State
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resignData, setResignData] = useState({ reason: '', comments: '' });
  const [resignLoading, setResignLoading] = useState(false);
  const [activeJoinId, setActiveJoinId] = useState(null); // id of the HiredWorker or Application/DirectHireRequest

  const [requestStayMessage, setRequestStayMessage] = useState(null);

  useEffect(() => {
    fetchProfileAndAvailability();
    fetchDirectHireRequests();
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      const stayNotif = res.data.find(n => n.title === 'Contractor Wants You to Stay' && !n.isRead);
      if (stayNotif) {
        setRequestStayMessage(stayNotif.message);
      }
    } catch (err) { console.error('Failed to fetch notifications:', err); }
  };

  const fetchDirectHireRequests = async () => {
    try {
      const res = await api.get('/api/professional/direct-hire-requests');
      setDirectHireRequests(res.data);
    } catch (err) { console.error('Failed to fetch direct hire requests:', err); }
  };

  const fetchProfileAndAvailability = async () => {
    try {
      setLoading(true);
      const userId = user?.id || user?._id;
      let freshProfile = user;
      if (userId) {
        const res = await api.get(`/api/auth/profile/${userId}`);
        freshProfile = res.data;
        setProfile(freshProfile);
      }
      
      const res = await api.get('/api/professional/availability');
      if (res.data) {
        setPost(res.data);
        setFormData({
          jobRole: res.data.jobRole,
          yearsOfExperience: res.data.yearsOfExperience,
          expectedSalary: res.data.expectedSalary,
          availableFrom: new Date(res.data.availableFrom).toISOString().split('T')[0],
          locationPreference: res.data.locationPreference,
          skillTags: res.data.skillTags || []
        });
      } else {
        setFormData({
          jobRole: freshProfile?.jobRole || '',
          yearsOfExperience: freshProfile?.yearsOfExperience || '',
          expectedSalary: '',
          availableFrom: '',
          locationPreference: freshProfile?.locationPreference || '',
          skillTags: []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      const newStatus = !isAvailable;
      await api.put('/api/professional/availability/toggle', { isAvailable: newStatus });
      setIsAvailable(newStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;
    setSubmitLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'skillTags') {
        formData[key].forEach(tag => data.append('skillTags', tag));
      } else {
        data.append(key, formData[key]);
      }
    });
    
    if (resume) data.append('resume', resume);
    certificates.forEach(c => data.append('certificates', c));

    try {
      if (post) {
        await api.put('/api/professional/availability', data);
      } else {
        await api.post('/api/professional/availability', data);
      }
      fetchProfileAndAvailability();
      setIsFormOpen(false);
      setIsAvailable(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleJoinDirectHire = async (requestId) => {
    setJoinLoading(true);
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/join`);
      toast.success('🎉 Successfully joined position!', { duration: 4000 });
      setJoinConfirm(null);
      // Update state
      setDirectHireRequests(prev => prev.map(req => {
        if (req._id === requestId) return { ...req, status: 'Joined' };
        if (req.status === 'Pending') return { ...req, status: 'Withdrawn' };
        return req;
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRejectDirectHire = async (requestId) => {
    if (!rejectionReason || rejectionReason.length < 10) {
      return toast.error('Please enter at least 10 characters.');
    }
    setRejectLoading(true);
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/reject`, { rejectionReason });
      toast.success('Your response has been submitted.');
      setRejectingId(null);
      setRejectionReason('');
      setDirectHireRequests(prev => prev.map(req => 
        req._id === requestId ? { ...req, status: 'Rejected' } : req
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejectLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput && !formData.skillTags.includes(skillInput)) {
      setFormData({ ...formData, skillTags: [...formData.skillTags, skillInput] });
      setSkillInput('');
    }
  };

  const removeSkill = (tag) => {
    setFormData({ ...formData, skillTags: formData.skillTags.filter(t => t !== tag) });
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Request to Stay Banner */}
      {requestStayMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
              <IconAlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-blue-900 dark:text-blue-100 mb-1">Contractor Requested You to Stay</h3>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{requestStayMessage}</p>
            </div>
          </div>
          <button 
            onClick={() => setRequestStayMessage(null)} 
            className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all text-sm shrink-0"
          >
            Acknowledge
          </button>
        </motion.div>
      )}

      {/* Direct Hire Requests Section */}
      {directHireRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-primary dark:text-white">Direct Hire Requests</h2>
          <div className="grid grid-cols-1 gap-4">
            {directHireRequests.map(req => (
              <div key={req._id} className={`bg-white dark:bg-slate-900 rounded-[24px] border ${req.status === 'Rejected' ? 'border-red-200 dark:border-red-900/50 opacity-75' : 'border-slate-200 dark:border-slate-800'} p-6 shadow-sm overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-primary dark:text-white">{req.contractorId?.companyName || req.contractorId?.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{req.jobRole}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${req.status === 'Pending' ? 'bg-orange-100 text-orange-600 border-orange-200' : req.status === 'Joined' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {req.workSiteLocation && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Location</p>
                      <p className="text-sm font-bold text-primary dark:text-white">{req.workSiteLocation}</p>
                    </div>
                  )}
                  {req.salary && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Salary</p>
                      <p className="text-sm font-black text-accent">{req.salary}</p>
                    </div>
                  )}
                  {req.duration && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Duration</p>
                      <p className="text-sm font-bold text-primary dark:text-white">{req.duration}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Requested On</p>
                    <p className="text-sm font-bold text-primary dark:text-white">{new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {req.status === 'Pending' && (
                  <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setJoinConfirm(req._id)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-2.5 rounded-xl transition-all"
                      >
                        Join Now
                      </button>
                      <button 
                        onClick={() => setRejectingId(rejectingId === req._id ? null : req._id)}
                        className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 font-black py-2.5 rounded-xl transition-all"
                      >
                        Reject
                      </button>
                    </div>

                    {/* Inline Reject Area */}
                    <AnimatePresence>
                      {rejectingId === req._id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value.slice(0, 300))}
                              placeholder="Please mention your reason for rejection..."
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/50 resize-none h-24 mb-2"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400">{rejectionReason.length}/300</span>
                              <div className="flex gap-2">
                                <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                                <button 
                                  onClick={() => handleRejectDirectHire(req._id)}
                                  disabled={rejectLoading || rejectionReason.length < 10}
                                  className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  {rejectLoading ? 'Submitting...' : 'Submit'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibility Toggle Card */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div className={`p-5 rounded-3xl ${isAvailable ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
             {isAvailable ? <IconEye size={32} /> : <IconEyeOff size={32} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-primary dark:text-white">Active Visibility</h2>
            <p className="text-slate-500 font-medium">{isAvailable ? 'Contractors can see you in the search results.' : 'You are currently hidden from employers.'}</p>
          </div>
        </div>
        
        <button 
          onClick={handleToggleVisibility}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all ${
            isAvailable 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
              : 'bg-green-500 text-white hover:shadow-lg shadow-green-500/20 hover:-translate-y-1'
          }`}
        >
          {isAvailable ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left: Current Profile Status */}
         <div className="lg:col-span-1 space-y-6">
            <h3 className="text-xl font-black text-primary dark:text-white flex items-center gap-2">
               Availability Status <IconAlertTriangle size={24} className="text-orange-500" />
            </h3>
            
            {post ? (
              <div className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Post</span>
                    <button onClick={() => setIsFormOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-accent">
                       <IconEdit size={20} />
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                        <h4 className="font-black text-primary dark:text-white text-lg">{post.jobRole}</h4>
                        <p className="text-sm font-bold text-slate-400">{post.yearsOfExperience} Years Experience</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Min Salary</p>
                          <p className="text-sm font-black text-accent">₹{post.expectedSalary}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Available From</p>
                          <p className="text-sm font-black text-primary dark:text-blue-100">{new Date(post.availableFrom).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                       {post.skillTags?.map((tag, i) => (
                         <span key={i} className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-md">
                           {tag}
                         </span>
                       ))}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                       {post.resumeUrl && (
                         <a href={post.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-accent transition-colors">
                            <IconFileText size={18} /> View Resume
                         </a>
                       )}
                       {post.certificateUrls?.map((url, i) => (
                         <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-accent transition-colors">
                            <IconCertificate size={18} /> Certificate {i + 1}
                         </a>
                       ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-[35px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                 <IconPackage size={48} className="mx-auto mb-4 text-slate-200" />
                 <p className="font-bold mb-4">No availability post found.</p>
                 <button 
                   onClick={() => setIsFormOpen(true)}
                   className="bg-accent text-white px-6 py-2 rounded-xl font-black text-sm"
                 >
                   Create One Now
                 </button>
              </div>
            )}
         </div>

         {/* Right: Form Section */}
         <div className="lg:col-span-2">
            <AnimatePresence>
               {isFormOpen && (
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl"
                 >
                   <div className="p-8 space-y-8">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xl font-black text-primary dark:text-white">{post ? 'Edit Availability' : 'Create Availability Post'}</h3>
                         <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><IconX /></button>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Job Role</label>
                               {roleOptions.length > 0 ? (
                                 <select
                                   required
                                   className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                   value={formData.jobRole} onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
                                 >
                                   <option value="" disabled>Select a role...</option>
                                   {roleOptions.map((role) => (
                                     <option key={role} value={role}>{role}</option>
                                   ))}
                                 </select>
                               ) : (
                                 <input 
                                   type="text" required placeholder="e.g. Master Mason"
                                   className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                   value={formData.jobRole} onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
                                 />
                               )}
                            </div>
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Years of Experience</label>
                               <input 
                                 type="number" required
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                 value={formData.yearsOfExperience} onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Expected Salary (Per Month)</label>
                               <input 
                                 type="text" required placeholder="e.g. 25,000"
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold text-accent"
                                 value={formData.expectedSalary} onChange={(e) => setFormData({...formData, expectedSalary: e.target.value})}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Available From</label>
                               <input 
                                 type="date" required
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                 value={formData.availableFrom} onChange={(e) => setFormData({...formData, availableFrom: e.target.value})}
                               />
                            </div>
                            <div className="md:col-span-2">
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Location Preference</label>
                               <input 
                                 type="text" required placeholder="e.g. Mumbai, Anywhere in Maharashtra"
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                 value={formData.locationPreference} onChange={(e) => setFormData({...formData, locationPreference: e.target.value})}
                               />
                            </div>
                            
                            <div className="md:col-span-2">
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Skills (Press Enter to add)</label>
                               <div className="flex flex-wrap gap-2 mb-3">
                                  {formData.skillTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1.5 text-xs font-black uppercase bg-accent text-white px-3 py-1.5 rounded-xl border border-white/10">
                                       {tag} <button type="button" onClick={() => removeSkill(tag)}><IconX size={14} /></button>
                                    </span>
                                  ))}
                               </div>
                               <input 
                                 type="text" placeholder="Add a skill..."
                                 className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                 value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                               />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Upload Resume (PDF)</label>
                               <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-accent transition-all">
                                  <IconUpload size={24} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-500">{resume ? resume.name : 'Choose File'}</span>
                                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} />
                               </label>
                            </div>
                            <div>
                               <label className="block text-xs font-black uppercase text-slate-400 mb-2">Certificates (Max 5)</label>
                               <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-accent transition-all">
                                  <IconUpload size={24} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-500">{certificates.length > 0 ? `${certificates.length} files` : 'Choose Files'}</span>
                                  <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={(e) => setCertificates(Array.from(e.target.files))} />
                               </label>
                            </div>
                         </div>

                         <div className="flex justify-end gap-4 pt-6">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all">Cancel</button>
                            <button type="submit" disabled={submitLoading} className="px-12 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                               {submitLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <IconCircleCheck size={20} />} 
                               {submitLoading ? 'Posting...' : (post ? 'Update Post' : 'Post Availability')}
                            </button>
                         </div>
                      </form>
                   </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Join Confirmation Modal */}
      <AnimatePresence>
        {joinConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCircleCheck size={32} />
              </div>
              <h2 className="text-2xl font-black text-center text-primary dark:text-white mb-4">Confirm Joining</h2>
              <p className="text-slate-500 text-center font-medium mb-8">Joining this position will automatically withdraw your other pending applications. Are you sure you want to join?</p>
              <div className="flex gap-4">
                <button onClick={() => setJoinConfirm(null)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={() => handleJoinDirectHire(joinConfirm)} disabled={joinLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                  {joinLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resignation Modal */}
      <AnimatePresence>
        {isResignModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-black text-primary dark:text-white mb-4">Submit Resignation</h2>
              <p className="text-slate-500 font-medium mb-6">You are required to give a minimum of 7 days notice before resignation. Your last working date will be {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">Reason</label>
                  <select 
                    value={resignData.reason} 
                    onChange={(e) => setResignData({ ...resignData, reason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                  >
                    <option value="">Select a reason</option>
                    <option value="Better Opportunity">Better Opportunity</option>
                    <option value="Personal Reasons">Personal Reasons</option>
                    <option value="Salary Dissatisfaction">Salary Dissatisfaction</option>
                    <option value="Work Condition Issues">Work Condition Issues</option>
                    <option value="Relocation">Relocation</option>
                    <option value="Project Completed">Project Completed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">Additional Comments (Optional)</label>
                  <textarea 
                    value={resignData.comments} 
                    onChange={(e) => setResignData({ ...resignData, comments: e.target.value.slice(0, 300) })}
                    placeholder="Any additional details you want to share..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-medium resize-none h-24"
                  />
                  <div className="text-right text-xs font-bold text-slate-400 mt-1">{resignData.comments.length}/300</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsResignModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                <button 
                  onClick={async () => {
                    if (!resignData.reason) return toast.error('Please select a reason.');
                    setResignLoading(true);
                    try {
                      await api.post('/api/professional/resign', { 
                        directHireRequestId: activeJoinId, 
                        resignationReason: resignData.reason, 
                        additionalComments: resignData.comments 
                      });
                      toast.success('Resignation submitted successfully.');
                      setIsResignModalOpen(false);
                      fetchDirectHireRequests();
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit resignation'); }
                    finally { setResignLoading(false); }
                  }} 
                  disabled={resignLoading || !resignData.reason} 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resignLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Submit Resignation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AvailabilityTab;
