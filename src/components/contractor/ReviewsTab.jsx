import React, { useState, useEffect } from 'react';
import api from '../../api';
import { IconStar, IconStarFilled, IconShieldCheck } from '@tabler/icons-react';

const ReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/contractor/reviews').then(res => {
      setReviews(res.data);
      setLoading(false);
    });
  }, []);

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      <div className="bg-primary p-12 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-5">
            <IconStarFilled size={200} />
         </div>
         <div className="relative z-10 text-center md:text-left">
            <h2 className="text-4xl font-black mb-2">Customer Reviews</h2>
            <p className="text-blue-200">See what clients are saying about your craftsmanship.</p>
         </div>
         <div className="bg-white/10 backdrop-blur-md p-8 rounded-[32px] border border-white/10 text-center min-w-[200px]">
            <p className="text-5xl font-black mb-2">{avgRating}</p>
            <div className="flex items-center justify-center gap-1 mb-2">
               {[1,2,3,4,5].map(i => i <= Math.round(avgRating) ? <IconStarFilled key={i} size={20} className="text-orange-400" /> : <IconStar key={i} size={20} className="text-white/20" />)}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">{reviews.length} Total Reviews</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.length > 0 ? reviews.map((r) => (
          <div key={r._id} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <p className="font-black text-primary dark:text-white uppercase tracking-tight">{r.reviewerId?.name || 'Anonymous'}</p>
                     {r.isVerified && <IconShieldCheck size={16} className="text-green-500" title="Verified Project" />}
                  </div>
                  <div className="flex gap-0.5">
                     {[1,2,3,4,5].map(i => i <= r.rating ? <IconStarFilled key={i} size={14} className="text-orange-400" /> : <IconStar key={i} size={14} className="text-slate-200 dark:text-slate-700" />)}
                  </div>
               </div>
               <span className="text-[10px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">"{r.reviewText}"</p>
          </div>
        )) : (
          <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No reviews yet</h3>
             <p className="text-slate-400">Complete projects to start earning ratings from your customers.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;
