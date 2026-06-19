import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { IconMapPin } from '@tabler/icons-react';

const ResignationModal = ({ isOpen, onClose, contractorName, jobRole, noticePeriodDays, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/api/professional/resign', { reason });
      toast.success(`Resignation submitted. You are now serving a ${noticePeriodDays || 7}-day notice period.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit resignation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-primary dark:text-white mb-2">Submit Resignation</h2>
            
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
              <p className="text-xs font-black uppercase text-slate-400 mb-1">Current Position</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contractorName}</p>
              <p className="text-sm font-medium text-slate-500">{jobRole}</p>
            </div>

            <div className="bg-orange-100 border border-orange-200 p-4 rounded-2xl mb-6 flex gap-2">
              <span className="shrink-0">⚠️</span>
              <p className="text-orange-800 font-bold text-sm">
                You will serve a mandatory {noticePeriodDays || 7}-day notice period. During this time you cannot apply to or accept any new jobs.
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Reason for Resignation *</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value.slice(0, 300))}
                  placeholder="Please provide your reason for resigning (minimum 20 characters)..."
                  className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl p-4 focus:ring-accent transition-all dark:text-white font-medium resize-none h-32 ${reason.length > 0 && reason.length < 20 ? 'border-red-400' : 'border-transparent'}`}
                />
                <div className={`text-right text-xs font-bold mt-1 ${reason.length < 20 ? 'text-red-400' : 'text-slate-400'}`}>
                  {reason.length} / 300
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all">Cancel</button>
              <button 
                onClick={handleSubmit} 
                disabled={loading || reason.length < 20} 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirm Resignation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResignationModal;
