import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconAlertTriangle, IconLink } from '@tabler/icons-react';
import api from '../api';
import toast from 'react-hot-toast';

const FileDisputeModal = ({ isOpen, onClose, hiredWorkerId, onSuccess }) => {
  const [category, setCategory] = useState('unpaid_wages');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hiredWorkerId) return;
    if (description.trim().length < 10) {
      return toast.error('Please describe the issue in at least 10 characters.');
    }

    setLoading(true);
    try {
      const res = await api.post('/api/disputes', {
        hiredWorkerId,
        category,
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined
      });

      if (res.data?.success) {
        toast.success('Dispute filed successfully.');
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to file dispute.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory('unpaid_wages');
    setDescription('');
    setEvidenceUrl('');
    onClose();
  };

  const categories = [
    { value: 'unpaid_wages', label: 'Unpaid Wages / Non-payment' },
    { value: 'unsafe_site', label: 'Unsafe Work Site' },
    { value: 'abandonment', label: 'Job Abandonment' },
    { value: 'misconduct', label: 'Misconduct / Harassment' },
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'other', label: 'Other Issue' }
  ];

  return (
    <AnimatePresence>
      {isOpen && hiredWorkerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-red-500">
                <IconAlertTriangle size={24} />
                <h3 className="text-2xl font-black uppercase tracking-tight">File a Dispute</h3>
              </div>
              <button onClick={handleClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <IconX size={18} />
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              Submit a formal report regarding this engagement. Our team will review the details and update the dispute status.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dispute Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description of the Incident *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide clear details about what happened..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm resize-none"
                />
              </div>

              {/* Evidence URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <IconLink size={12} /> Supporting Evidence URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g. Link to screenshots, invoice, or log"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xs transition-all uppercase tracking-wider shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'File Dispute'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FileDisputeModal;
