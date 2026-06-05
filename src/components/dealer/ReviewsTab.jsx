import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { IconStarFilled, IconStarHalfFilled, IconMessageCircle, IconCircleCheck, IconLoader2, IconX } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ReviewsTab = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyModalReview, setReplyModalReview] = useState(null);
  
  const [sort, setSort] = useState('Newest First');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchReviews();
  }, [user._id]);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/api/reviews/dealer/${user._id}`);
      setReviews(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedReviews = () => {
    let filtered = [...reviews];
    if (filter === '5 Star') filtered = filtered.filter(r => r.overallRating >= 5);
    else if (filter === '4 Star') filtered = filtered.filter(r => r.overallRating >= 4 && r.overallRating < 5);
    else if (filter === '3 Star') filtered = filtered.filter(r => r.overallRating >= 3 && r.overallRating < 4);
    else if (filter === 'Below 3') filtered = filtered.filter(r => r.overallRating < 3);

    if (sort === 'Newest First') filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'Highest Rating') filtered.sort((a, b) => b.overallRating - a.overallRating);
    else if (sort === 'Lowest Rating') filtered.sort((a, b) => a.overallRating - b.overallRating);

    return filtered;
  };

  const handleReplySuccess = (updatedReview) => {
    setReviews(reviews.map(r => r._id === updatedReview._id ? updatedReview : r));
    setReplyModalReview(null);
  };

  const displayedReviews = getFilteredAndSortedReviews();

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading Reviews...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary dark:text-white tracking-tight">Customer Reviews</h2>
          <p className="text-slate-500 font-medium">Manage and respond to feedback from contractors.</p>
        </div>
        <div className="flex gap-4">
           <select 
             className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
             value={filter} onChange={e => setFilter(e.target.value)}
           >
             <option value="All">All Ratings</option>
             <option value="5 Star">5 Star</option>
             <option value="4 Star">4 Star</option>
             <option value="3 Star">3 Star</option>
             <option value="Below 3">Below 3 Star</option>
           </select>
           <select 
             className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
             value={sort} onChange={e => setSort(e.target.value)}
           >
             <option value="Newest First">Newest First</option>
             <option value="Highest Rating">Highest Rating</option>
             <option value="Lowest Rating">Lowest Rating</option>
           </select>
        </div>
      </div>

      <div className="space-y-6">
        {displayedReviews.length > 0 ? displayedReviews.map(r => (
          <div key={r._id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-black text-primary dark:text-white">{r.contractorId?.companyName || r.contractorId?.name}</h3>
                    {r.isVerified && (
                      <span className="flex items-center gap-1 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                        <IconCircleCheck size={12} /> Verified Purchase
                      </span>
                    )}
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-6 mb-4">
                    <div className="flex items-center gap-1 text-accent">
                       <IconStarFilled size={20} />
                       <span className="font-black text-lg">{r.overallRating.toFixed(1)}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex gap-4 text-xs font-bold text-slate-400">
                       <span>Quality: <span className="text-slate-600 dark:text-slate-300">{r.productQualityRating}</span></span>
                       <span>Speed: <span className="text-slate-600 dark:text-slate-300">{r.deliverySpeedRating}</span></span>
                       <span>Comm: <span className="text-slate-600 dark:text-slate-300">{r.communicationRating}</span></span>
                    </div>
                 </div>

                 <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-4">{r.reviewText}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="w-full md:w-64 shrink-0">
                 {r.dealerReply ? (
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative">
                      <div className="absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-slate-50 dark:border-r-slate-800/50"></div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2 flex items-center gap-1.5"><IconMessageCircle size={14} /> Your Reply</h4>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{r.dealerReply}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(r.dealerRepliedAt).toLocaleDateString()}</p>
                   </div>
                 ) : (
                   <button 
                     onClick={() => setReplyModalReview(r)}
                     className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-accent dark:hover:text-accent font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                   >
                     <IconMessageCircle size={18} /> Reply to Review
                   </button>
                 )}
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconStarFilled size={60} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
             <h3 className="text-xl font-black text-primary dark:text-white mb-2">No reviews yet</h3>
             <p className="text-slate-400 font-medium max-w-sm mx-auto">Complete orders to start receiving verified reviews from contractors.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {replyModalReview && (
          <ReplyModal 
            review={replyModalReview} 
            onClose={() => setReplyModalReview(null)} 
            onSuccess={handleReplySuccess} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ReplyModal = ({ review, onClose, onSuccess }) => {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (replyText.length < 5) return toast.error("Reply is too short");
    setSubmitting(true);
    try {
      const res = await api.post(`/api/reviews/${review._id}/reply`, { replyText });
      toast.success("Reply posted successfully");
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Reply to Review</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-primary"><IconX size={20} /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
             <p className="text-xs font-black uppercase text-slate-400 mb-2">Review from {review.contractorId?.companyName || review.contractorId?.name}</p>
             <p className="text-sm italic text-slate-600 dark:text-slate-300">"{review.reviewText}"</p>
          </div>

          <div>
             <textarea 
               value={replyText} onChange={e => setReplyText(e.target.value)} maxLength={300}
               placeholder="Write a professional response to this review..."
               className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white resize-none text-sm font-medium"
             />
             <div className="flex justify-end mt-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{replyText.length} / 300</span>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
           <button 
             onClick={handleSubmit} disabled={submitting}
             className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {submitting ? <IconLoader2 className="animate-spin" /> : 'Post Reply'}
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReviewsTab;
