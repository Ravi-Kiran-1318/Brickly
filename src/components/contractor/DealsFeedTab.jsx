import React, { useState, useEffect } from 'react';
import api from '../../api';
import { IconTag, IconMapPin, IconBuildingStore, IconClock, IconFlame, IconPackage } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import DealerProfileModal from './DealerProfileModal';
import toast from 'react-hot-toast';

const DealsFeedTab = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [initialProduct, setInitialProduct] = useState(null);

  useEffect(() => {
    api.get('/api/contractor/deals').then(res => {
      setDeals(res.data);
      setLoading(false);
    });
  }, []);

  const handleGrabDeal = async (deal) => {
    try {
      const res = await api.get(`/api/contractor/dealers/${deal.dealerId._id}`);
      setInitialProduct({
        productId: deal.productId || '', 
        productName: deal.productName,
        unit: deal.unit || 'unit',
        minQuantity: deal.minimumQuantity || 1,
        isDeal: true,
        dealId: deal._id,
        dealPrice: deal.discountedPrice,
        unitPrice: deal.originalPrice
      });
      setSelectedDealer(res.data);
    } catch (err) {
      toast.error("Failed to load dealer details");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight flex items-center gap-2">
            <IconFlame className="text-orange-500" /> Hot Deals for Building Projects
         </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-[40px] animate-pulse" />)
        ) : deals.length > 0 ? deals.map((deal) => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={deal._id} 
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all" />
            
            <div>
               <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">
                  <IconTag size={14} /> Flash Deal
               </div>
               <h3 className="text-xl font-black text-primary dark:text-white uppercase mb-4 leading-tight">{deal.productName}</h3>
               
               <div className="flex items-end gap-3 mb-2">
                  <span className="text-3xl font-black text-accent">₹{deal.discountedPrice}</span>
                  <span className="text-sm text-slate-400 line-through font-bold mb-1">₹{deal.originalPrice}</span>
                  <span className="text-xs font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                    {Math.round(((deal.originalPrice - deal.discountedPrice)/deal.originalPrice)*100)}% OFF
                  </span>
               </div>
               {/* MOQ — Minimum Order Quantity */}
               <div className="flex items-center gap-2 text-xs font-bold text-orange-500 bg-orange-50 p-2 rounded-lg mb-6 w-max">
                 <IconPackage size={16}/> Min. Order: {deal.minimumQuantity} {deal.unit || 'units'} required
               </div>
               
               <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                     <IconBuildingStore size={16} className="text-slate-400"/> {deal.dealerId?.shopName}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                     <IconMapPin size={16} className="text-slate-400"/> {deal.dealerId?.location?.city || 'See Location'}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                     <IconClock size={16} className="text-slate-400"/> Valid until {new Date(deal.validUntil).toLocaleDateString()}
                  </div>
               </div>
            </div>

            <button 
              onClick={() => handleGrabDeal(deal)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200/50"
            >
               Grab this Deal
            </button>
          </motion.div>
        )) : (
          <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconTag size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No active deals</h3>
             <p className="text-slate-400">Deals from various material vendors will appear here soon.</p>
          </div>
        )}
      </div>
      <DealerProfileModal 
        isOpen={!!selectedDealer} 
        onClose={() => { setSelectedDealer(null); setInitialProduct(null); }} 
        dealerData={selectedDealer}
        initialProduct={initialProduct}
      />
    </div>
  );
};

export default DealsFeedTab;
