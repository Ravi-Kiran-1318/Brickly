import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  IconStarFilled, IconStar, IconMessageCircle, IconFlag, 
  IconSend, IconMoodSmile, IconAward, IconCheck
} from '@tabler/icons-react';

const ReviewsTab = () => {
  const [data, setData] = useState({ reviews: [], breakdown: {}, avgRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Sub-tabs: 'received' or 'left'
  const savedSubTab = localStorage.getItem('reviewsSubTab');
  const [subTab, setSubTab] = useState(savedSubTab || 'received');
  const [reviewsLeft, setReviewsLeft] = useState([]);
  const [reviewsLeftLoading, setReviewsLeftLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchReviews(), fetchReviewsLeft()]).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    const highlightId = localStorage.getItem('highlightReviewId');
    if (highlightId) {
      localStorage.removeItem('highlightReviewId');
      if (localStorage.getItem('reviewsSubTab')) {
        localStorage.removeItem('reviewsSubTab');
      }
      setTimeout(() => {
        const element = document.getElementById(`review-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-accent', 'ring-offset-4', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-accent', 'ring-offset-4', 'dark:ring-offset-slate-900');
          }, 3000);
        }
      }, 100);
    }
  }, [loading, subTab]);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/api/professional/my-reviews');
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReviewsLeft = async () => {
    setReviewsLeftLoading(true);
    try {
      const res = await api.get('/api/professional/contractors/reviews/left');
      setReviewsLeft(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLeftLoading(false);
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const res = await api.put(`/api/professional/reviews/${reviewId}/reply`, { reply: replyText });
      setData(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => r._id === reviewId ? res.data : r)
      }));
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply posted!');
    } catch (err) {
      toast.error('Failed to reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleReport = async (reviewId) => {
    if (!window.confirm('Are you sure you want to report this review?')) return;
    try {
      await api.put(`/api/professional/reviews/${reviewId}/report`, { reason: 'Inappropriate content' });
      toast.success('Review reported');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to report');
    }
  };

  const handleReportReply = async (reviewId) => {
    const reason = window.prompt("Please enter a reason for reporting this reply:");
    if (!reason || reason.trim().length === 0) return;
    try {
      await api.put(`/api/professional/contractor-reviews/${reviewId}/report`, { reportReason: reason });
      toast.success('Contractor reply reported for moderation.');
      fetchReviewsLeft();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report reply');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading your reviews...</div>;

  const { reviews, breakdown, avgRating, totalReviews } = data;

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
        <button
          onClick={() => setSubTab('received')}
          className={`pb-2 px-4 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${subTab === 'received' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
        >
          Reviews Received ({reviews.length})
        </button>
        <button
          onClick={() => setSubTab('left')}
          className={`pb-2 px-4 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${subTab === 'left' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
        >
          Reviews Left ({reviewsLeft.length})
        </button>
      </div>

      {subTab === 'received' ? (
        <div className="space-y-8">
          {/* Rating Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Big Rating */}
              <div className="text-center lg:border-r lg:border-slate-100 lg:dark:border-slate-800 lg:pr-10">
                <p className="text-6xl font-black text-primary dark:text-white leading-none">{avgRating || '—'}</p>
                <div className="flex items-center justify-center gap-1 my-2">
                  {[1,2,3,4,5].map(i => (
                    i <= Math.round(avgRating) 
                      ? <IconStarFilled key={i} size={20} className="text-yellow-500" />
                      : <IconStar key={i} size={20} className="text-slate-300" />
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{totalReviews} reviews</p>
              </div>

              {/* Breakdown */}
              <div className="flex-1 space-y-2">
                {[5,4,3,2,1].map(star => {
                  const count = breakdown[star] || 0;
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16 text-xs font-bold text-slate-500 shrink-0">
                        {star} <IconStarFilled size={12} className="text-yellow-500" />
                      </div>
                      <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: (5 - star) * 0.1 }}
                          className="h-full bg-yellow-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-400 w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Review Cards */}
          <div className="space-y-4">
            {reviews.length > 0 ? reviews.map(review => (
              <motion.div 
                key={review._id}
                id={`review-${review._id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-black flex items-center justify-center text-lg">
                      {review.contractorId?.companyName?.charAt(0) || review.contractorId?.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-black text-primary dark:text-white">
                        {review.contractorId?.companyName || review.contractorId?.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl shrink-0">
                    {[1,2,3,4,5].map(i => (
                      i <= review.rating 
                        ? <IconStarFilled key={i} size={14} className="text-yellow-500" />
                        : <IconStar key={i} size={14} className="text-slate-300" />
                    ))}
                  </div>
                </div>

                {/* Review Content */}
                <h5 className="font-bold text-primary dark:text-white mb-2">{review.title}</h5>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{review.comment}</p>

                {/* Reply */}
                {review.reply && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4 border-l-4 border-accent">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Your Reply</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{review.reply}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{review.repliedAt && new Date(review.repliedAt).toLocaleDateString()}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {!review.reply && (
                    <button 
                      onClick={() => { setReplyingTo(replyingTo === review._id ? null : review._id); setReplyText(''); }}
                      className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1"
                    >
                      <IconMessageCircle size={14} /> Reply
                    </button>
                  )}
                  {!review.isReported && (
                    <button 
                      onClick={() => handleReport(review._id)}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all flex items-center gap-1"
                    >
                      <IconFlag size={14} /> Report
                    </button>
                  )}
                  {review.isReported && (
                    <span className="text-xs font-bold text-red-400 px-3 py-2">Reported</span>
                  )}
                </div>

                {/* Reply Input */}
                <AnimatePresence>
                  {replyingTo === review._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 flex gap-3">
                        <input 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-accent transition-all"
                        />
                        <button 
                          onClick={() => handleReply(review._id)}
                          disabled={replyLoading || !replyText.trim()}
                          className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50"
                        >
                          {replyLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <IconSend size={16} />}
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
                <p className="text-slate-400 font-medium max-w-sm mx-auto">When contractors review your work, their feedback will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewsLeftLoading ? (
            <div className="text-center py-10 text-slate-400 font-bold">Loading reviews left...</div>
          ) : reviewsLeft.length > 0 ? (
            reviewsLeft.map(review => (
              <motion.div 
                key={review._id}
                id={`review-${review._id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 font-black flex items-center justify-center text-lg">
                      {review.contractorName?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-black text-primary dark:text-white">{review.contractorName}</h4>
                      <p className="text-xs text-slate-400 font-medium">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl shrink-0">
                    {[1,2,3,4,5].map(i => (
                      i <= review.rating 
                        ? <IconStarFilled key={i} size={14} className="text-yellow-500" />
                        : <IconStar key={i} size={14} className="text-slate-300" />
                    ))}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{review.reviewText}</p>

                {/* Contractor Reply */}
                {review.contractorReply && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-2 border-l-4 border-blue-500 flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Contractor's Response</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{review.contractorReply}</p>
                    </div>
                    
                    <div className="ml-4 shrink-0">
                      {review.isReported ? (
                        <span className="text-[10px] font-black uppercase text-red-500 tracking-wider bg-red-100/50 dark:bg-red-950/30 px-2.5 py-1 rounded-md">Reported</span>
                      ) : (
                        <button
                          onClick={() => handleReportReply(review._id)}
                          className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 p-1.5 rounded-md transition-colors"
                          title="Report this reply as inappropriate"
                        >
                          <IconFlag size={12} /> Report Reply
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <IconMoodSmile size={60} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-black text-primary dark:text-white mb-2">No Reviews Left</h3>
              <p className="text-slate-400 font-medium max-w-sm mx-auto">You haven't left any contractor reviews yet. Complete jobs and submit your feedback from the Applications tab.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
