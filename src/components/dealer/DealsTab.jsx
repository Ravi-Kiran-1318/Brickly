import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconTag, IconPlus, IconClock, IconEye, IconFileInvoice, 
  IconX, IconEdit, IconTrash, IconCalendarTime, IconCircleCheck
} from '@tabler/icons-react';

const DealsTab = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  
  const [formData, setFormData] = useState({
    productName: '', originalPrice: '', discountedPrice: '', 
    minimumQuantity: '', validUntil: '', description: '', scheduledStartDate: ''
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await api.get('/api/dealer/deals');
      setDeals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDeal) {
        await api.put(`/api/dealer/deals/${editingDeal._id}`, formData);
      } else {
        await api.post('/api/dealer/deals', formData);
      }
      fetchDeals();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDeal = async (id) => {
    if (!window.confirm('Delete this deal?')) return;
    try {
      await api.delete(`/api/dealer/deals/${id}`);
      setDeals(deals.filter(d => d._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      productName: '', originalPrice: '', discountedPrice: '', 
      minimumQuantity: '', validUntil: '', description: '', scheduledStartDate: ''
    });
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  const editDeal = (d) => {
    setEditingDeal(d);
    setFormData({
      productName: d.productName,
      originalPrice: d.originalPrice,
      discountedPrice: d.discountedPrice,
      minimumQuantity: d.minimumQuantity,
      validUntil: new Date(d.validUntil).toISOString().split('T')[0],
      description: d.description || '',
      scheduledStartDate: d.scheduledStartDate ? new Date(d.scheduledStartDate).toISOString().split('T')[0] : ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && deals.length === 0) return <div className="p-8 text-center text-slate-400 font-bold">Loading Deals...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary dark:text-white">Deals & Offers</h2>
          <p className="text-sm text-slate-400">Launch time-limited discounts to attract contractors.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 transition-all"
          >
            <IconPlus size={20} /> Create Deal
          </button>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl"
          >
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-primary dark:text-white">{editingDeal ? 'Update Deal' : 'Launch New Deal'}</h3>
                  <button type="button" onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><IconX /></button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Product Name</label>
                    <input 
                      type="text" required placeholder="e.g. TMT Steel Bars"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.productName} onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Min. Quantity</label>
                    <input 
                      type="number" required placeholder="MOQ for deal"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.minimumQuantity} onChange={(e) => setFormData({...formData, minimumQuantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Original Price</label>
                    <input 
                      type="number" required placeholder="₹ 0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.originalPrice} onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Discounted Price</label>
                    <input 
                      type="number" required placeholder="₹ 0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-black text-accent"
                      value={formData.discountedPrice} onChange={(e) => setFormData({...formData, discountedPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Valid Until</label>
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.validUntil} onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Start Date (Optional)</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.scheduledStartDate} onChange={(e) => setFormData({...formData, scheduledStartDate: e.target.value})}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Deal Description</label>
                    <input 
                      type="text" placeholder="e.g. Flash sale for next 48 hours only!"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
               </div>

               <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button type="button" onClick={resetForm} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all">Cancel</button>
                  <button type="submit" className="px-12 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all">
                     {editingDeal ? 'Save Changes' : 'Launch Deal'}
                  </button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {deals.map(deal => (
          <DealCard 
            key={deal._id} 
            deal={deal} 
            onEdit={() => editDeal(deal)}
            onDelete={() => deleteDeal(deal._id)}
          />
        ))}
        {deals.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
             No deals created.
          </div>
        )}
      </div>
    </div>
  );
};

const DealCard = ({ deal, onEdit, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const isExpired = new Date() > new Date(deal.validUntil);
  const isScheduled = deal.scheduledStartDate && new Date() < new Date(deal.scheduledStartDate);

  useEffect(() => {
    if (isExpired) {
      setTimeLeft('Expired');
      return;
    }

    const timer = setInterval(() => {
      const target = isScheduled ? new Date(deal.scheduledStartDate) : new Date(deal.validUntil);
      const diff = target - new Date();
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [deal, isExpired, isScheduled]);

  return (
    <div className={`relative bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-6 flex flex-col group transition-all hover:shadow-xl ${
      isExpired ? 'opacity-60 grayscale' : ''
    }`}>
      {isExpired && (
        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] rounded-[35px] z-10 flex items-center justify-center">
           <span className="bg-slate-800 text-white px-6 py-2 rounded-2xl font-black uppercase tracking-widest text-sm">Expired</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
         <div className="bg-orange-500/10 text-orange-600 p-2.5 rounded-xl">
            <IconTag size={24} />
         </div>
         <div className="flex gap-2">
            {!isExpired && (
              <button onClick={onEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                <IconEdit size={18} />
              </button>
            )}
            <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
              <IconTrash size={18} />
            </button>
         </div>
      </div>

      <div className="flex-1">
         <div className="flex items-baseline gap-2 mb-1">
            <h4 className="text-xl font-black text-primary dark:text-white truncate">{deal.productName}</h4>
            {isScheduled && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Scheduled</span>}
         </div>
         <p className="text-xs text-slate-400 font-medium line-clamp-1">{deal.description}</p>
      </div>

      <div className="my-6 grid grid-cols-2 gap-4">
         <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Was</p>
            <p className="text-sm font-bold text-slate-400 line-through">₹{deal.originalPrice}</p>
         </div>
         <div className="bg-accent/5 p-3 rounded-2xl border border-accent/20">
            <p className="text-[9px] font-black uppercase text-accent mb-1">Now</p>
            <p className="text-base font-black text-accent">₹{deal.discountedPrice}</p>
         </div>
      </div>

      <div className="flex items-center justify-between mb-4">
         <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-slate-400">Min. Quantity</span>
            <span className="text-sm font-black text-primary dark:text-blue-100">{deal.minimumQuantity} Units</span>
         </div>
         <div className="text-right">
            <span className="text-[9px] font-black uppercase text-slate-400 flex items-center justify-end gap-1">
               <IconClock size={10} /> {isScheduled ? 'Starts in' : 'Ends in'}
            </span>
            <span className="text-sm font-black text-orange-600">{timeLeft}</span>
         </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
               <IconEye size={14} /> {deal.viewCount}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
               <IconFileInvoice size={14} /> {deal.quoteRequestCount}
            </div>
         </div>
         <span className="text-[10px] font-black uppercase text-slate-400">{new Date(deal.validUntil).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default DealsTab;
