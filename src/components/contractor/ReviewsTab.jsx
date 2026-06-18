import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  IconStar, IconStarFilled, IconMessageCircle, IconFlag, 
  IconSend, IconMoodSmile, IconAward
} from '@tabler/icons-react';

const ReviewsTab = () => {
  const [data, setData] = useState({ reviews: [], averageRating: 0, totalReviewCount: 0, ratingBreakdown: {} });
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/api/contractor/my-reviews');
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    if (replyText.length > 300) return toast.error('Reply must be maximum 300 characters');
    setReplyLoading(true);
    try {
      const res = await api.put(`/api/contractor/reviews/${reviewId}/reply`, { reply: replyText });
      setData(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => r._id === reviewId ? res.data : r)
      }));
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleReport = async (reviewId) => {
    const reason = window.prompt("Please enter a reason for reporting this review:");
    if (!reason || reason.trim().length === 0) return;
    try {
      await api.put(`/api/contractor/reviews/${reviewId}/report`, { reportReason: reason });
      toast.success('Review reported to admin.');
      setData(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => r._id === reviewId ? { ...r, isReported: true } : r)
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report review');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading reviews...</div>;

  const { reviews, averageRating, totalReviewCount, ratingBreakdown } = data;

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="bg-primary p-8 md:p-12 rounded-[40px] text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <IconStarFilled size={200} />
        </div>
        <div className="relative z-10 text-center lg:text-left flex-1">
          <h2 className="text-3xl md:text-4xl font-black mb-2">Feedback from Professionals</h2>
          <p className="text-blue-200 text-sm md:text-base max-w-lg">
            See ratings and review comments from the professionals who have worked with you.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-8 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 w-full lg:w-auto relative z-10">
          <div className="text-center sm:border-r sm:border-white/10 sm:pr-8 shrink-0">
            <p className="text-5xl font-black mb-2">{averageRating || '—'}</p>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                i <= Math.round(averageRating) 
                  ? <IconStarFilled key={i} size={18} className="text-yellow-400" />
                  : <IconStar key={i} size={18} className="text-white/20" />
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">{totalReviewCount} Total Reviews</p>
          </div>

          <div className="flex-1 space-y-1.5 w-full">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingBreakdown[star] || 0;
              const pct = totalReviewCount > 0 ? (count / totalReviewCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 w-full">
                  <div className="flex items-center gap-1 w-12 text-[10px] font-black uppercase text-blue-200 shrink-0">
                    {star} <IconStarFilled size={10} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden min-w-[80px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: (5 - star) * 0.1 }}
                      className="h-full bg-yellow-400 rounded-full"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-200 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-6">
        {reviews.length > 0 ? reviews.map(r => (
          <motion.div 
            key={r._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="font-black text-primary dark:text-white text-lg">{r.professionalName}</h4>
                <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-0.5">{r.jobRole}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400">{r.date}</span>
                <div className="flex gap-0.5 mt-1 bg-yellow-50 dark:bg-yellow-900/10 px-2.5 py-1 rounded-lg">
                  {[1, 2, 3, 4, 5].map(i => (
                    i <= r.rating 
                      ? <IconStarFilled key={i} size={14} className="text-yellow-500" />
                      : <IconStar key={i} size={14} className="text-slate-200 dark:text-slate-700" />
                  ))}
                </div>
              </div>
            </div>

            {/* Review Text */}
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium italic">
              "{r.reviewText}"
            </p>

            {/* Reply Display */}
            {r.contractorReply && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4 border-l-4 border-accent">
                <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Your Response</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.contractorReply}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              {!r.contractorReply && (
                <button 
                  onClick={() => { setReplyingTo(replyingTo === r._id ? null : r._id); setReplyText(''); }}
                  className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1"
                >
                  <IconMessageCircle size={14} /> Reply
                </button>
              )}
              {!r.isReported ? (
                <button 
                  onClick={() => handleReport(r._id)}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1"
                >
                  <IconFlag size={14} /> Report
                </button>
              ) : (
                <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-lg">Reported</span>
              )}
            </div>

            {/* Inline Reply Input */}
            <AnimatePresence>
              {replyingTo === r._id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex gap-3">
                    <input 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value.slice(0, 300))}
                      placeholder="Write your reply (max 300 characters)..."
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-accent outline-none"
                    />
                    <button 
                      onClick={() => handleReply(r._id)}
                      disabled={replyLoading || !replyText.trim()}
                      className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                      {replyLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <IconSend size={16} />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <IconMoodSmile size={60} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-primary dark:text-white mb-2">No Reviews Yet</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto">When professionals leave feedback, their ratings and reviews will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;
