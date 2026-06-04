import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  IconPhotoPlus, IconPhoto, IconTrash, IconPlus, 
  IconEdit, IconMapPin, IconClock, IconTag
} from '@tabler/icons-react';

const PortfolioTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', projectType: 'House', description: '', duration: '', location: ''
  });
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/api/contractor/portfolio');
      setItems(res.data);
    } catch (err) {
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    files.forEach(file => data.append('images', file));

    try {
      await api.post('/api/contractor/portfolio', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Project added to portfolio!");
      setShowForm(false);
      setFormData({ title: '', projectType: 'House', description: '', duration: '', location: '' });
      setFiles([]);
      fetchPortfolio();
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this project from portfolio?")) return;
    try {
      await api.delete(`/api/contractor/portfolio/${id}`);
      toast.success("Project removed");
      fetchPortfolio();
    } catch (err) {
      toast.error("Cleanup failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white">Project Showcase</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
          {showForm ? 'Cancel' : <><IconPhotoPlus size={20} /> Add Project</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden shadow-2xl"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">Project Title</label>
              <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Luxury Apartment Complex" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">Project Type</label>
              <select value={formData.projectType} onChange={(e) => setFormData({...formData, projectType: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 outline-none">
                {['House', 'Villa', 'Mall', 'Apartment', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-500">Description</label>
              <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tell us about the project..." className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 outline-none resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">Duration</label>
              <input value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 18 Months" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">Location</label>
              <input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="e.g. Whitefield, Bangalore" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 outline-none" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-500">Project Photos (max 5)</label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/50 transition-colors hover:border-accent">
                <IconPhoto size={48} className="text-slate-300" />
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="bg-white dark:bg-primary px-6 py-3 rounded-xl border border-slate-200 font-bold text-sm cursor-pointer hover:bg-slate-50 transition-all">
                  {files.length > 0 ? `${files.length} Files Selected` : 'Select Images'}
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <button disabled={isUploading} type="submit" className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all">
                {isUploading ? 'Uploading to Cloudinary...' : 'Publish to Portfolio'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-[40px] animate-pulse" />)
        ) : items.length > 0 ? items.map((item) => (
          <motion.div 
            layout 
            key={item._id} 
            className="group bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all"
          >
            <div className="h-56 relative overflow-hidden">
               <img src={item.images[0] || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute top-4 left-4">
                  <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{item.projectType}</span>
               </div>
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white/90 backdrop-blur rounded-lg text-slate-600 hover:text-accent"><IconEdit size={18}/></button>
                  <button onClick={() => handleDelete(item._id)} className="p-2 bg-white/90 backdrop-blur rounded-lg text-red-500 hover:bg-red-500 hover:text-white"><IconTrash size={18}/></button>
               </div>
            </div>
            <div className="p-8">
               <h3 className="text-xl font-black text-primary dark:text-white mb-4 line-clamp-1">{item.title}</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-3 mb-6">{item.description}</p>
               <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><IconMapPin size={14}/> {item.location}</span>
                  <span className="flex items-center gap-1.5"><IconClock size={14}/> {item.duration}</span>
               </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconPhoto size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Portfolio is empty</h3>
             <p className="text-slate-400 max-w-sm mx-auto">Upload your best projects to build trust and attract more clients.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioTab;
