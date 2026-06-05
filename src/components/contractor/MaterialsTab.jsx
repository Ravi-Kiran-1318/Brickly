import React, { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import {
  IconBuildingStore, IconMapPin, IconPhone, IconMail, 
  IconPackage, IconTag, IconArrowRight, IconSearch,
  IconX, IconChevronRight, IconCheck, IconStarFilled, IconShieldCheck
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import DealerProfileModal from './DealerProfileModal';

const MaterialsTab = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ products: [], address: '', timeline: '', message: '' });

  useEffect(() => {
    fetchDealers();
  }, [nearMe]);

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/contractor/dealers?nearMe=${nearMe}&search=${search}`);
      setDealers(res.data);
    } catch (err) { toast.error("Failed to load dealers"); }
    finally { setLoading(false); }
  };

  const openDealerProfile = async (id) => {
    try {
      const res = await api.get(`/api/contractor/dealers/${id}`);
      setSelectedDealer(res.data);
    } catch (err) { toast.error("Could not load dealer details"); }
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (quoteForm.products.length === 0) return toast.error("Select at least one product");
    try {
      await api.post('/api/contractor/quotes', {
        dealerId: selectedDealer.dealer._id,
        products: quoteForm.products,
        deliveryAddress: quoteForm.address,
        projectTimeline: quoteForm.timeline,
        message: quoteForm.message
      });
      toast.success("Quote request sent!");
      setQuoteModal(false);
      setQuoteForm({ products: [], address: '', timeline: '', message: '' });
    } catch (err) { toast.error("Failed to send quote"); }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
           <button onClick={() => setNearMe(false)} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${!nearMe ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' : 'text-slate-400'}`}>All India</button>
           <button onClick={() => setNearMe(true)} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${nearMe ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' : 'text-slate-400'}`}>Near Work Site</button>
        </div>
        <div className="flex-1 w-full flex items-center gap-3">
           <div className="relative flex-1">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Material or Location (City/Pincode)" 
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none font-bold text-primary dark:text-white" 
              />
           </div>
           <button 
             onClick={() => fetchDealers()}
             className="p-4 bg-accent text-white rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
           >
              <IconSearch size={24} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : dealers.map((dealer) => (
          <div key={dealer._id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-accent transition-all group">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <IconBuildingStore size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-primary dark:text-white">{dealer.shopName || dealer.name}</h3>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">
                  <span className="flex items-center gap-1.5"><IconMapPin size={14}/> {dealer.locationDetails?.city || 'India'}</span>
                  <span className="flex items-center gap-1.5"><IconTag size={14}/> {dealer.categories?.slice(0,2).join(', ')}</span>
                </div>
                {dealer.totalReviews > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                     <span className="flex items-center gap-1 text-sm font-black text-accent">
                        <IconStarFilled size={16} /> {dealer.averageRating?.toFixed(1)}
                     </span>
                     <span className="text-xs font-bold text-slate-400">({dealer.totalReviews} reviews)</span>
                     <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        <IconShieldCheck size={10} /> Verified Purchases Only
                     </span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => openDealerProfile(dealer._id)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-accent hover:text-white transition-all">
              <IconArrowRight size={24} />
            </button>
          </div>
        ))}
      </div>

      <DealerProfileModal 
        isOpen={!!selectedDealer} 
        onClose={() => setSelectedDealer(null)} 
        dealerData={selectedDealer} 
      />
    </div>
  );
};

export default MaterialsTab;
