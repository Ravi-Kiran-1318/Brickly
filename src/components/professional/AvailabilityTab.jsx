import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconCalendarEvent, IconUpload, IconFileText, IconCertificate, 
  IconTrash, IconCircleCheck, IconEdit, IconX, IconEye, 
  IconEyeOff, IconAlertTriangle, IconPackage
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    fetchProfileAndAvailability();
  }, [user]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      fetchAvailability();
      setIsFormOpen(false);
      setIsAvailable(true);
    } catch (err) {
      console.error(err);
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
                            <button type="submit" className="px-12 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all flex items-center gap-2">
                               <IconCircleCheck size={20} /> {post ? 'Update Post' : 'Post Availability'}
                            </button>
                         </div>
                      </form>
                   </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};

export default AvailabilityTab;
