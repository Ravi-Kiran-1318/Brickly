import React, { useState } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { IconX, IconStarFilled, IconStar, IconSend } from '@tabler/icons-react';

const LeaveReviewModal = ({ isOpen, onClose, professional }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !professional) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Please select a rating');
    setLoading(true);
    try {
      await api.post(`/api/contractor/professionals/${professional._id}/review`, {
        rating, title, comment
      });
      toast.success('Review submitted successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-2xl font-black text-primary dark:text-white">Review Professional</h2>
              <p className="text-sm font-bold text-slate-400 mt-1">Leave feedback for {professional.name}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Overall Rating</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    {star <= (hoverRating || rating) 
                      ? <IconStarFilled size={40} className="text-yellow-500 drop-shadow-md" />
                      : <IconStar size={40} className="text-slate-200 dark:text-slate-700" />
                    }
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Review Title</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Excellent Work, Highly Recommended"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detailed Feedback</label>
              <textarea 
                required
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience working with this professional..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all resize-none custom-scrollbar"
              />
            </div>

            <button 
              type="submit"
              disabled={loading || rating === 0}
              className="w-full bg-accent text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <IconSend size={20} />}
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LeaveReviewModal;
